import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  decimal,
  pgEnum,
  index,
  jsonb,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

// Provider types enum
export const providerEnum = pgEnum("provider_type", [
  "algolia",
  "upstash_search",
  "mixedbread_search",
]);

export const battleStatusEnum = pgEnum("battle_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

// Database table
export const databases = pgTable("databases", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: varchar("label", { length: 255 }).notNull(),
  provider: providerEnum("provider").notNull(),
  // Credentials stored as environment file format
  credentials: text("credentials").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Battle table
export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: varchar("label", { length: 255 }).notNull(),
    databaseId1: uuid("database_id_1")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    databaseId2: uuid("database_id_2")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    queries: text("queries").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    status: battleStatusEnum("status").default("pending").notNull(),
    // Error message if status is "failed"
    error: text("error"),
    meanScoreDb1: decimal("mean_score_db1", { precision: 4, scale: 2 }),
    meanScoreDb2: decimal("mean_score_db2", { precision: 4, scale: 2 }),
    // Session ID to track user's battles
    sessionId: varchar("session_id", { length: 255 }),
    isDemo: boolean("is_demo").default(false),
    // Whether to use LLM comparison for this battle
    useLlmComparison: boolean("use_llm_comparison").default(true),
  },
  (table) => {
    return [
      index("session_id_idx").on(table.sessionId),
      index("is_demo_idx").on(table.isDemo),
    ];
  }
);

// Battle queries table
export const battleQueries = pgTable("battle_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  battleId: uuid("battle_id")
    .notNull()
    .references(() => battles.id, { onDelete: "cascade" }),
  queryText: text("query_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  error: text("error"),
  // Quality winner: 0 = database1 wins, 1 = database2 wins, null = no selection
  qualityWinner: decimal("quality_winner", { precision: 1, scale: 0 }),
});

// Search results table
export const searchResults = pgTable(
  "search_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    battleQueryId: uuid("battle_query_id")
      .notNull()
      .references(() => battleQueries.id, { onDelete: "cascade" }),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    results: jsonb("results").notNull(),
    score: decimal("score", { precision: 4, scale: 2 }),
    llmFeedback: text("llm_feedback"),
    // Structured scoring fields
    topicalRelevance: decimal("topical_relevance", { precision: 4, scale: 2 }),
    contentQuality: decimal("content_quality", { precision: 4, scale: 2 }),
    userIntentMatch: decimal("user_intent_match", { precision: 4, scale: 2 }),
    // Timing information in milliseconds
    searchDuration: decimal("search_duration", { precision: 8, scale: 2 }),
    llmDuration: decimal("llm_duration", { precision: 8, scale: 2 }),
    // Manual winner selection
    isManualWinner: boolean("is_manual_winner").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.battleQueryId, table.databaseId),
    };
  }
);

// Relations for better type safety
export const databasesRelations = relations(databases, ({ many }) => ({
  battlesAsDb1: many(battles, { relationName: "database1" }),
  battlesAsDb2: many(battles, { relationName: "database2" }),
  searchResults: many(searchResults),
}));

export const battlesRelations = relations(battles, ({ one, many }) => ({
  database1: one(databases, {
    fields: [battles.databaseId1],
    references: [databases.id],
    relationName: "database1",
  }),
  database2: one(databases, {
    fields: [battles.databaseId2],
    references: [databases.id],
    relationName: "database2",
  }),
  queries: many(battleQueries),
}));

export const battleQueriesRelations = relations(
  battleQueries,
  ({ one, many }) => ({
    battle: one(battles, {
      fields: [battleQueries.battleId],
      references: [battles.id],
    }),
    results: many(searchResults),
  })
);

export const searchResultsRelations = relations(searchResults, ({ one }) => ({
  query: one(battleQueries, {
    fields: [searchResults.battleQueryId],
    references: [battleQueries.id],
  }),
  database: one(databases, {
    fields: [searchResults.databaseId],
    references: [databases.id],
  }),
}));

export type BattleQuery = typeof battleQueries.$inferSelect;
