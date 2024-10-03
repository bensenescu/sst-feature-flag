import {
  ResolutionDetails,
  EvaluationContext,
  JsonValue,
  ErrorCode,
} from "@openfeature/server-sdk";
import { db } from "../drizzle";
import {
  featureFlagMemberTable,
  featureFlagTable,
} from "../feature-flag/feature-flag.sql";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

function getValueKey(valueType: string) {
  switch (valueType.toUpperCase()) {
    case "BOOLEAN":
      return "booleanValue" as const;
    case "STRING":
      return "stringValue" as const;
    case "NUMBER":
      return "numberValue" as const;
    case "STRUCTURED":
      return "structuredValue" as const;
    default:
      throw new Error(`Invalid value type: ${valueType}`);
  }
}

const getFlagValue = <T extends boolean | string | number>(
  value: T,
  valueType: "BOOLEAN" | "STRING" | "NUMBER" | "STRUCTURED",
) => {
  if (valueType === "STRUCTURED") {
    if (typeof value !== "string") {
      throw new Error(`Invalid structured value type: ${typeof value}`);
    }
    return JSON.parse(value);
  }
  return value;
};

export module FeatureFlagEvaluation {
  export const genericFlagEvaluation = async <
    T extends boolean | string | number,
  >(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
  ) => {
    const [res] = await db
      .select()
      .from(featureFlagTable)
      .where(
        and(
          eq(featureFlagTable.flagKey, flagKey),
          eq(featureFlagTable.archived, false),
        ),
      )
      .leftJoin(
        featureFlagMemberTable,
        eq(featureFlagTable.id, featureFlagMemberTable.flagId),
      );

    const flag = res?.feature_flag

    if (!flag) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: ErrorCode.FLAG_NOT_FOUND,
      };
    }

    if (flag.isDisabled) {
      return {
        value: defaultValue,
        reason: "DISABLED",
      };
    }

    const valueKey = getValueKey(flag.valueType);
    if (flag.isStatic) {
      const value = flag[valueKey] as T;
      const isValidStructuredValue =
        flag.valueType === "STRUCTURED" &&
        typeof value === "string" &&
        typeof defaultValue === "object";
      if (
        value === null ||
        (typeof value !== typeof defaultValue && !isValidStructuredValue)
      ) {
        return {
          value: defaultValue,
          reason: "ERROR",
          errorCode: ErrorCode.TYPE_MISMATCH,
        };
      }

      return {
        value: getFlagValue(
          flag[valueKey] as T,
          flag.valueType as "BOOLEAN" | "STRING" | "NUMBER" | "STRUCTURED",
        ),
        reason: "STATIC",
      };
    }

    const contextSchema = z.object({
      entityType: z.string(),
      entityId: z.string(),
    });

    const parseTargetingSchemaResult = contextSchema.safeParse(context);

    if (!parseTargetingSchemaResult.success) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: ErrorCode.TARGETING_KEY_MISSING,
        errorMessage:
          "Context must include both entityType and entityId for dynamic flags.",
      };
    }

    const { entityType, entityId } = parseTargetingSchemaResult.data;

    const [flagMemberRes] = await db
      .select()
      .from(featureFlagMemberTable)
      .leftJoin(
        featureFlagMemberTable,
        eq(featureFlagTable.id, featureFlagMemberTable.flagId),
      )
      .where(
        and(
          eq(featureFlagTable.flagKey, flagKey),
          eq(featureFlagMemberTable.entityType, entityType),
          eq(featureFlagMemberTable.entityId, entityId),
        ),
      );

    const flagMember = flagMemberRes?.feature_flag_member;

    // Return default if there is no entry for the given target. This means that the entity hasn't
    // been explicitly targeted or excluded so we should opt to return the default value.
    if (!flagMember) {
      return {
        value: defaultValue,
        reason: "DEFAULT",
      };
    }

    const value = flagMember[valueKey] as T;
    if (value === null || typeof value !== typeof defaultValue) {
      return {
        value: defaultValue,
        reason: "error",
        errorCode: ErrorCode.TYPE_MISMATCH,
      };
    }

    // code to resolve boolean details
    return {
      value: getFlagValue(
        flagMember[valueKey] as T,
        flag.valueType as "BOOLEAN" | "STRING" | "NUMBER" | "STRUCTURED",
      ),
      reason: "TARGETING_MATCH",
    };
  };

  export const resolveBooleanEvaluation = async (
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<boolean>> => {
    return genericFlagEvaluation<boolean>(flagKey, defaultValue, context);
  };

  export const resolveStringEvaluation = (
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<string>> => {
    return genericFlagEvaluation<string>(flagKey, defaultValue, context);
  };

  export const resolveNumberEvaluation = (
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<number>> => {
    return genericFlagEvaluation<number>(flagKey, defaultValue, context);
  };

  export const resolveObjectEvaluation = (
    flagKey: string,
    defaultValue: JsonValue,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<JsonValue>> => {
    throw new Error("Not implemented");
    // return genericFlagEvaluation<string>(
    //   flagKey,
    //   defaultValue,
    //   context,
    //   "structuredValue"
    // );
  };
}
