ALTER TABLE "accounts" DROP CONSTRAINT "accounts_type_check";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_status_check";--> statement-breakpoint
ALTER TABLE "loan_details" DROP CONSTRAINT "loan_interest_rate_check";--> statement-breakpoint
ALTER TABLE "loan_details" DROP CONSTRAINT "loan_principal_check";--> statement-breakpoint
ALTER TABLE "loan_details" DROP CONSTRAINT "loan_tenure_check";--> statement-breakpoint
ALTER TABLE "loan_schedules" DROP CONSTRAINT "loan_schedule_status_check";--> statement-breakpoint
ALTER TABLE "loan_schedules" DROP CONSTRAINT "loan_schedule_amount_check";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transaction_amount_check";--> statement-breakpoint
DROP INDEX "accounts_customer_idx";--> statement-breakpoint
DROP INDEX "accounts_branch_idx";--> statement-breakpoint
DROP INDEX "loan_schedules_loan_idx";--> statement-breakpoint
DROP INDEX "loan_schedules_status_idx";--> statement-breakpoint
ALTER TABLE "loan_schedules" ALTER COLUMN "remaining_amount" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "idx_accounts_customer" ON "accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_type" ON "accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "idx_customers_created" ON "customers" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "loan_schedules" DROP COLUMN "paid_amount";