import {
  pgTable,
  text,
  timestamp,
  serial,
  index,
  unique,
  boolean,
  jsonb,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
// export const featureModeEnum = pgEnum("mode", [
//   "ENABLED",
//   "DISABLED",
//   "PREVIEW",
// ]);

export const featureFlagTable = pgTable(
  "feature_flag",
  {
    id: serial("id").primaryKey(),
    flagKey: text("flag_key").notNull().unique(),
    description: text("description").notNull(),
    valueType: text("value_type").notNull(),
    booleanValue: boolean("boolean_value"),
    stringValue: text("string_value"),
    numberValue: integer("number_value"),
    structuredValue: text("structured_value"),
    isDisabled: boolean("is_disabled").default(false).notNull(),
    isStatic: boolean("is_static").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      flagKeyIndex: index("flag_key_index").on(table.flagKey),
    };
  },
);

export const featureFlagMemberTable = pgTable(
  "feature_flag_member",
  {
    id: serial("id").primaryKey(),
    flagId: integer("flag_id")
      .notNull()
      .references(() => featureFlagTable.id),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    booleanValue: boolean("boolean_value"),
    stringValue: text("string_value"),
    numberValue: integer("number_value"),
    structuredValue: text("structured_value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      entityIdIndex: index("flag_member_entity_id_idx").on(table.entityId),
      unq: unique().on(table.flagId, table.entityId, table.entityType),
    };
  },
);

// export const eventTypeEnum = pgEnum("event_type", ["ADDED", "REMOVED"]);

// This table is used to log changes to feature flag members.
// We can show this in the UI to show the history of changes.
export const featureFlagMemberLogTable = pgTable(
  "feature_flag_member_log",
  {
    id: serial("id").primaryKey(),
    flagId: integer("flag_id") // Change here
      .notNull()
      .references(() => featureFlagTable.id), // Change here
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    booleanValue: boolean("boolean_value"),
    stringValue: text("string_value"),
    numberValue: integer("number_value"),
    structuredValue: text("structured_value"),
    event: text("event").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => {
    return {
      entityIdIndex: index("flag_member_log_entity_id_idx").on(table.entityId),
    };
  },
);
