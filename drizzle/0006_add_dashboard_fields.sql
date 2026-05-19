ALTER TABLE "events" ADD COLUMN "lc_payout" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "commission_note" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "elements_summary" text;