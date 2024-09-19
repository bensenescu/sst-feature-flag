import { pgTable, text, varchar, primaryKey, timestamp, serial, pgEnum, integer, index } from "drizzle-orm/pg-core";
const featureFlagTypeEnum = pgEnum('feature_flag_type', ['ENABLED', 'DISABLED', 'PREVIEW']);

export const featureFlagTable = pgTable("feature_flag", {
  id: serial('id').primaryKey(),
  flagName: varchar("flag_name", { length: 255 }).notNull().unique(),
  mode: featureFlagTypeEnum("mode").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    flagNameIndex: index("flag_name_index").on(table.flagName),
  }
});

export const eventTypeEnum = pgEnum('event_type', ['ADDED', 'REMOVED']);

// This table is used to log changes to feature flag members. 
// We can show this in the UI to show the history of changes.
export const featureFlagMembersLogTable = pgTable("feature_flag_members", {
  id: serial('id').primaryKey(),
  flagId: integer("flag_id").notNull().references(() => featureFlagTable.id),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 255 }).notNull(),
  event: eventTypeEnum("event").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => {
  return {
    entityIdIndex: index("entity_id_index").on(table.entityId),
  }
});