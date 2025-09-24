ALTER TABLE "search_results" ADD COLUMN "topical_relevance" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "content_quality" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "user_intent_match" numeric(4, 2);