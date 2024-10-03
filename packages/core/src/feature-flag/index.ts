import { and, desc, eq, or } from "drizzle-orm";

import { db } from "../drizzle";
import {
  featureFlagMemberLogTable,
  featureFlagMemberTable,
  featureFlagTable,
} from "./feature-flag.sql";
import { isJsonString } from "../utils";

interface Flag {
  flagKey: string;
  isStatic: boolean;
  description: string;
  valueType: string;
  isDisabled: boolean;
  booleanValue?: boolean;
  stringValue?: string;
  numberValue?: number;
  structuredValue?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FeatureFlagMember {
  flagKey: string;
  entityId: string;
  entityType: string;
  createdAt: Date;
}

export module FeatureFlag {
  // export const Flag = z.object({
  //   flagKey: z.string(),
  //   isStatic: z.boolean(),
  //   description: z.string(),
  //   valueType: z.string(),
  //   isDisabled: z.boolean(),
  //   booleanValue: z.boolean().optional(),
  //   stringValue: z.string().optional(),
  //   numberValue: z.number().optional(),
  //   structuredValue: z
  //     .string()
  //     .refine(isJsonString, {
  //       message: "Invalid JSON string",
  //     })
  //     .optional(),
  //   createdAt: z.number(),
  //   updatedAt: z.number(),
  // });

  // export const FeatureFlagMember = z.object({
  //   flagKey: z.string(),
  //   entityId: z.string(),
  //   entityType: z.string(),
  //   createdAt: z.number(),
  // });

  // export type Flag = z.infer<typeof Flag>;
  // export type FeatureFlagMember = z.infer<typeof FeatureFlagMember>;
  export const generateValueMap = (
    valueType: string,
    value: string | boolean | number,
  ) => {
    /*
     * Helper to generate the value map.
     */
    let values: {
      booleanValue?: boolean;
      stringValue?: string;
      numberValue?: number;
      structuredValue?: string;
    } = {
      booleanValue: undefined,
      stringValue: undefined,
      numberValue: undefined,
      structuredValue: undefined,
    };

    const typeMismatchError = (expected: string) =>
      `Programming Error: Type mismatch. Expected ${expected} for ${valueType} type.`;

    switch (valueType.toUpperCase()) {
      case "BOOLEAN":
        if (typeof value === "string") {
          values.booleanValue = value === "True";
        } else if (typeof value === "boolean") {
          values.booleanValue = value;
        } else {
          throw new Error(
            typeMismatchError("boolean or string 'True'/'False'"),
          );
        }
        break;
      case "STRING":
        if (typeof value !== "string") {
          throw new Error(typeMismatchError("string"));
        }
        values.stringValue = value;
        break;
      case "NUMBER":
        if (typeof value !== "number") {
          throw new Error(typeMismatchError("number"));
        }
        values.numberValue = value;
        break;
      case "STRUCTURED":
        if (typeof value === "object") {
          values.structuredValue = JSON.stringify(value);
        } else if (typeof value === "string") {
          if (!isJsonString(value)) {
            throw new Error(typeMismatchError("string or javascript object"));
          }
          values.structuredValue = value;
        } else {
          throw new Error(typeMismatchError("string or javascript object"));
        }
        break;
      default:
        throw new Error(`Programming Error: Invalid value type: ${valueType}.`);
    }

    return values;
  };

  // TODO: Add pagination, sorting, etc
  export const list = async (filters?: { isStatic?: boolean }) => {
    return {
      items: await db
        .select()
        .from(featureFlagTable)
        .where(
          and(
            eq(featureFlagTable.archived, false),
            filters?.isStatic !== undefined
              ? eq(featureFlagTable.isStatic, filters.isStatic)
              : undefined,
          ),
        ),
    };
  };

  export const get = async (flagKey: string) => {
    const flag = await db
      .select()
      .from(featureFlagTable)
      .where(
        and(
          eq(featureFlagTable.flagKey, flagKey),
          eq(featureFlagTable.archived, false),
        ),
      );
    if (flag.length === 0) {
      return null;
    }
    return flag[0];
  };

  export const create = async (
    input: Omit<Flag, "createdAt" | "updatedAt" | "isDisabled">,
  ) => {
    const hasBooleanValue =
      input.valueType === "BOOLEAN" && input.booleanValue !== undefined;
    const hasStringValue =
      input.valueType === "STRING" && input.stringValue !== undefined;
    const hasNumberValue =
      input.valueType === "NUMBER" && input.numberValue !== undefined;
    const hasStructuredValue =
      input.valueType === "STRUCTURED" && input.structuredValue !== undefined;

    if (
      input.isStatic &&
      !(
        hasBooleanValue ||
        hasStringValue ||
        hasNumberValue ||
        hasStructuredValue
      )
    ) {
      throw new Error("Static value is required if the flag is static.");
    }

    return db.insert(featureFlagTable).values(input).returning();
  };

  export const update = async (
    flagKey: string,
    input: Partial<Omit<Flag, "isStatic" | "createdAt" | "updatedAt">>,
  ) => {
    // TODO: What happens if the flag doesn't exist?
    await db
      .update(featureFlagTable)
      .set({
        flagKey: input.flagKey,
        description: input.description,
        isDisabled: input.isDisabled,
        booleanValue: input.booleanValue,
        stringValue: input.stringValue,
        numberValue: input.numberValue,
        structuredValue: input.structuredValue,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(featureFlagTable.flagKey, flagKey),
          eq(featureFlagTable.archived, false),
        ),
      );
  };

  export const archive = async (flagKey: string) => {
    return db
      .update(featureFlagTable)
      // Append "_archived" so that the flag key is free to be reused since they are unique
      .set({ archived: true, flagKey: `${flagKey}_archived` })
      .where(eq(featureFlagTable.flagKey, flagKey));
  };

  // Only use this in tests.
  export const __delete_test_flag = async (flagKey: string) => {
    return db
      .delete(featureFlagTable)
      .where(eq(featureFlagTable.flagKey, flagKey));
  };

  export const addMembers = async (
    flagKey: string,
    entityIds: string[],
    entityType: string,
    valueMap: {
      booleanValue?: boolean;
      stringValue?: string;
      numberValue?: number;
      structuredValue?: string;
    },
  ) => {

    const flagRes = await db.select().from(featureFlagTable).where(eq(featureFlagTable.flagKey, flagKey))


    const flag = flagRes?.[0]
    if (!flag) {
      throw new Error(`Flag ${flagKey} not found`);
    }

    // TODO: Make this a transaction
    const membersToAdd = entityIds.map((entityId) => ({
      flagId: flag.id,
      entityId,
      entityType,
      booleanValue: valueMap.booleanValue,
      stringValue: valueMap.stringValue,
      numberValue: valueMap.numberValue,
      structuredValue: valueMap.structuredValue,
    }));

    // This onConflictDoNothing could be dangerous if featureFlagMember involves more data in the future.
    //   Then, other updates outside of flagKey, entityId, and entityType may not get updated when
    // the unique constraint is violated.
    await db
      .insert(featureFlagMemberTable)
      .values(membersToAdd)
      .onConflictDoNothing();

    const logEntries = membersToAdd.map((entry) => ({
      ...entry,
      flagId: flag.id,
      event: "ADDED" as const,
    }));
    await db.insert(featureFlagMemberLogTable).values(logEntries);
  };

  export const removeMembers = async (
    input: Pick<FeatureFlagMember, "flagKey" | "entityId">[],
  ) => {
    const flagKey = input[0]?.flagKey
    if (!flagKey) {
      throw new Error('No flag key provided');
    }
    const flagRes = await db.select().from(featureFlagTable).where(eq(featureFlagTable.flagKey, flagKey))

    const flag = flagRes[0]
    if (!flag) {
      throw new Error(`Flag ${flagKey} not found`);
    }
    // TODO: Make this a transaction
    const deletedMembers = await db
      .delete(featureFlagMemberTable)
      .where(
        or(
          ...input.map((entry) =>
            and(
              eq(featureFlagMemberTable.flagId, flag.id),
              eq(featureFlagMemberTable.entityId, entry.entityId),
            ),
          ),
        ),
      )
      .returning();

    // TODO: If this fails, we should add it to a queue to be retried.
    const logEntries = deletedMembers.map((entry) => ({
      flagId: flag.id,
      entityId: entry.entityId,
      entityType: entry.entityType,
      event: "REMOVED" as const,
    }));
    await db.insert(featureFlagMemberLogTable).values(logEntries);
  };

  // TODO: Add pagination, sorting, etc. This should probably return a count as well.
  export const getMembers = async (flagKey: string) => {
    const flagRes = await db.select().from(featureFlagTable).where(eq(featureFlagTable.flagKey, flagKey))

    const flag = flagRes?.[0]
    if (!flag) {
      throw new Error(`Flag ${flagKey} not found`);
    }
    return db
      .select()
      .from(featureFlagMemberTable)
      .where(eq(featureFlagMemberTable.flagId, flag.id))
      .orderBy(desc(featureFlagMemberTable.createdAt));
  };

  export const getFlagsForEntity = async (entityId: string) => {
    return db
      .select()
      .from(featureFlagMemberTable)
      .where(eq(featureFlagMemberTable.entityId, entityId))
      .orderBy(desc(featureFlagMemberTable.createdAt));
  };
}
