DROP INDEX "accounts_customer_id_idx";--> statement-breakpoint
DROP INDEX "accounts_branch_id_idx";--> statement-breakpoint
DROP INDEX "accounts_customer_type_idx";--> statement-breakpoint
DROP INDEX "bankers_branch_id_idx";--> statement-breakpoint
DROP INDEX "customers_mobile_idx";--> statement-breakpoint
DROP INDEX "loan_details_disbursal_account_idx";--> statement-breakpoint
DROP INDEX "loan_schedules_loan_account_idx";--> statement-breakpoint
DROP INDEX "loan_schedules_due_date_idx";--> statement-breakpoint
DROP INDEX "transactions_from_account_idx";--> statement-breakpoint
DROP INDEX "transactions_to_account_idx";--> statement-breakpoint
DROP INDEX "transactions_banker_id_idx";--> statement-breakpoint
DROP INDEX "transactions_created_at_idx";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "account_type" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "loan_schedules" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "loan_schedules" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD COLUMN "paid_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD COLUMN "remaining_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_customer_idx" ON "accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "accounts_branch_idx" ON "accounts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "loan_schedules_loan_idx" ON "loan_schedules" USING btree ("loan_account_number");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_type_check" CHECK ("accounts"."account_type" IN ('SAVINGS', 'CURRENT', 'LOAN'));--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_status_check" CHECK ("accounts"."status" IN ('ACTIVE', 'CLOSED'));--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_interest_rate_check" CHECK ("loan_details"."interest_rate" >= 0);--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_principal_check" CHECK ("loan_details"."principal_amount" > 0);--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_tenure_check" CHECK ("loan_details"."tenure_months" > 0);--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedule_status_check" CHECK ("loan_schedules"."status" IN ('PENDING', 'PAID', 'OVERDUE'));--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedule_amount_check" CHECK ("loan_schedules"."emi_amount" >= 0 AND "loan_schedules"."paid_amount" >= 0 AND "loan_schedules"."remaining_amount" >= 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_amount_check" CHECK ("transactions"."amount" > 0);--> statement-breakpoint
DROP TYPE "public"."account_status";--> statement-breakpoint
DROP TYPE "public"."account_type";--> statement-breakpoint
DROP TYPE "public"."loan_schedule_status";--> statement-breakpoint
DROP TYPE "public"."transaction_type";