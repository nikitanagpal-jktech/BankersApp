CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('SAVINGS', 'CURRENT', 'LOAN');--> statement-breakpoint
CREATE TYPE "public"."loan_schedule_status" AS ENUM('PENDING', 'PAID', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_DISBURSAL', 'LOAN_EMI');--> statement-breakpoint
CREATE SEQUENCE "public"."banker_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."branch_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."customer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "accounts" (
	"account_number" varchar(30) PRIMARY KEY NOT NULL,
	"customer_id" varchar(30) NOT NULL,
	"branch_id" varchar(20) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"min_balance" numeric(15, 2) DEFAULT '500.00' NOT NULL,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bankers" (
	"banker_id" varchar(20) PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"branch_id" varchar(20) NOT NULL,
	CONSTRAINT "bankers_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"branch_id" varchar(20) PRIMARY KEY NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"ifsc_code" varchar(20) NOT NULL,
	"address" text NOT NULL,
	CONSTRAINT "branches_ifsc_code_unique" UNIQUE("ifsc_code")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"customer_id" varchar(30) PRIMARY KEY DEFAULT 'CUST' || lpad(nextval('customer_id_seq')::text, 6, '0') NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"dob" date NOT NULL,
	"gender" varchar(20),
	"marital_status" varchar(20),
	"primary_mobile" varchar(15) NOT NULL,
	"secondary_phone" varchar(15),
	"email" varchar(255),
	"pan" varchar(10) NOT NULL,
	"aadhaar" varchar(50) NOT NULL,
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_primary_mobile_unique" UNIQUE("primary_mobile"),
	CONSTRAINT "customers_pan_unique" UNIQUE("pan"),
	CONSTRAINT "customers_aadhaar_unique" UNIQUE("aadhaar")
);
--> statement-breakpoint
CREATE TABLE "loan_details" (
	"loan_id" serial PRIMARY KEY NOT NULL,
	"loan_account_number" varchar(30) NOT NULL,
	"disbursal_account_number" varchar(30) NOT NULL,
	"principal_amount" numeric(15, 2) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"tenure_months" integer NOT NULL,
	"monthly_emi" numeric(15, 2) NOT NULL,
	"remaining_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loan_details_loan_account_number_unique" UNIQUE("loan_account_number")
);
--> statement-breakpoint
CREATE TABLE "loan_schedules" (
	"schedule_id" serial PRIMARY KEY NOT NULL,
	"loan_account_number" varchar(30) NOT NULL,
	"installment_no" integer NOT NULL,
	"due_date" date NOT NULL,
	"principal_component" numeric(15, 2) NOT NULL,
	"interest_component" numeric(15, 2) NOT NULL,
	"emi_amount" numeric(15, 2) NOT NULL,
	"status" "loan_schedule_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "loan_schedule_installment_unique" UNIQUE("loan_account_number","installment_no")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"transaction_id" serial PRIMARY KEY NOT NULL,
	"ref_number" varchar(50) NOT NULL,
	"from_account" varchar(30),
	"to_account" varchar(30),
	"type" "transaction_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"banker_id" varchar(20) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_ref_number_unique" UNIQUE("ref_number")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bankers" ADD CONSTRAINT "bankers_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_loan_account_number_accounts_account_number_fk" FOREIGN KEY ("loan_account_number") REFERENCES "public"."accounts"("account_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_disbursal_account_number_accounts_account_number_fk" FOREIGN KEY ("disbursal_account_number") REFERENCES "public"."accounts"("account_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_loan_account_number_loan_details_loan_account_number_fk" FOREIGN KEY ("loan_account_number") REFERENCES "public"."loan_details"("loan_account_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_account_accounts_account_number_fk" FOREIGN KEY ("from_account") REFERENCES "public"."accounts"("account_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_accounts_account_number_fk" FOREIGN KEY ("to_account") REFERENCES "public"."accounts"("account_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_banker_id_bankers_banker_id_fk" FOREIGN KEY ("banker_id") REFERENCES "public"."bankers"("banker_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_customer_id_idx" ON "accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "accounts_branch_id_idx" ON "accounts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "accounts_customer_type_idx" ON "accounts" USING btree ("customer_id","account_type");--> statement-breakpoint
CREATE INDEX "bankers_branch_id_idx" ON "bankers" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "customers_mobile_idx" ON "customers" USING btree ("primary_mobile");--> statement-breakpoint
CREATE INDEX "loan_details_disbursal_account_idx" ON "loan_details" USING btree ("disbursal_account_number");--> statement-breakpoint
CREATE INDEX "loan_schedules_loan_account_idx" ON "loan_schedules" USING btree ("loan_account_number");--> statement-breakpoint
CREATE INDEX "loan_schedules_due_date_idx" ON "loan_schedules" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "loan_schedules_status_idx" ON "loan_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_from_account_idx" ON "transactions" USING btree ("from_account");--> statement-breakpoint
CREATE INDEX "transactions_to_account_idx" ON "transactions" USING btree ("to_account");--> statement-breakpoint
CREATE INDEX "transactions_banker_id_idx" ON "transactions" USING btree ("banker_id");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");