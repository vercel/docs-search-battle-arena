import { pgTable, uuid, varchar, text, timestamp, index, foreignKey, numeric, boolean, unique, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const battleStatus = pgEnum("battle_status", ['pending', 'in_progress', 'completed', 'failed'])
export const providerType = pgEnum("provider_type", ['algolia', 'upstash_search', 'mixedbread_search'])


export const databases = pgTable("databases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	label: varchar({ length: 255 }).notNull(),
	provider: providerType().notNull(),
	credentials: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const battles = pgTable("battles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	label: varchar({ length: 255 }).notNull(),
	databaseId1: uuid("database_id_1").notNull(),
	databaseId2: uuid("database_id_2").notNull(),
	queries: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	status: battleStatus().default('pending').notNull(),
	error: text(),
	meanScoreDb1: numeric("mean_score_db1", { precision: 4, scale:  2 }),
	meanScoreDb2: numeric("mean_score_db2", { precision: 4, scale:  2 }),
	sessionId: varchar("session_id", { length: 255 }),
	isDemo: boolean("is_demo").default(false),
	useLlmComparison: boolean("use_llm_comparison").default(true),
}, (table) => [
	index("is_demo_idx").using("btree", table.isDemo.asc().nullsLast().op("bool_ops")),
	index("session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.databaseId1],
			foreignColumns: [databases.id],
			name: "battles_database_id_1_databases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.databaseId2],
			foreignColumns: [databases.id],
			name: "battles_database_id_2_databases_id_fk"
		}).onDelete("cascade"),
]);

export const searchResults = pgTable("search_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	battleQueryId: uuid("battle_query_id").notNull(),
	databaseId: uuid("database_id").notNull(),
	results: jsonb().notNull(),
	score: numeric({ precision: 4, scale:  2 }),
	llmFeedback: text("llm_feedback"),
	searchDuration: numeric("search_duration", { precision: 8, scale:  2 }),
	llmDuration: numeric("llm_duration", { precision: 8, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	topicalRelevance: numeric("topical_relevance", { precision: 4, scale:  2 }),
	contentQuality: numeric("content_quality", { precision: 4, scale:  2 }),
	userIntentMatch: numeric("user_intent_match", { precision: 4, scale:  2 }),
	isManualWinner: boolean("is_manual_winner").default(false),
}, (table) => [
	foreignKey({
			columns: [table.battleQueryId],
			foreignColumns: [battleQueries.id],
			name: "search_results_battle_query_id_battle_queries_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.databaseId],
			foreignColumns: [databases.id],
			name: "search_results_database_id_databases_id_fk"
		}).onDelete("cascade"),
	unique("search_results_battle_query_id_database_id_unique").on(table.battleQueryId, table.databaseId),
]);

export const battleQueries = pgTable("battle_queries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	battleId: uuid("battle_id").notNull(),
	queryText: text("query_text").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	error: text(),
	qualityWinner: numeric("quality_winner", { precision: 1, scale:  0 }),
}, (table) => [
	foreignKey({
			columns: [table.battleId],
			foreignColumns: [battles.id],
			name: "battle_queries_battle_id_battles_id_fk"
		}).onDelete("cascade"),
]);
