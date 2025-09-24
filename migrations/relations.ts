import { relations } from "drizzle-orm/relations";
import { databases, battles, battleQueries, searchResults } from "./schema";

export const battlesRelations = relations(battles, ({one, many}) => ({
	database_databaseId1: one(databases, {
		fields: [battles.databaseId1],
		references: [databases.id],
		relationName: "battles_databaseId1_databases_id"
	}),
	database_databaseId2: one(databases, {
		fields: [battles.databaseId2],
		references: [databases.id],
		relationName: "battles_databaseId2_databases_id"
	}),
	battleQueries: many(battleQueries),
}));

export const databasesRelations = relations(databases, ({many}) => ({
	battles_databaseId1: many(battles, {
		relationName: "battles_databaseId1_databases_id"
	}),
	battles_databaseId2: many(battles, {
		relationName: "battles_databaseId2_databases_id"
	}),
	searchResults: many(searchResults),
}));

export const searchResultsRelations = relations(searchResults, ({one}) => ({
	battleQuery: one(battleQueries, {
		fields: [searchResults.battleQueryId],
		references: [battleQueries.id]
	}),
	database: one(databases, {
		fields: [searchResults.databaseId],
		references: [databases.id]
	}),
}));

export const battleQueriesRelations = relations(battleQueries, ({one, many}) => ({
	searchResults: many(searchResults),
	battle: one(battles, {
		fields: [battleQueries.battleId],
		references: [battles.id]
	}),
}));