ALTER TABLE "battles" ADD COLUMN "use_llm_comparison" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "is_manual_winner" boolean DEFAULT false;