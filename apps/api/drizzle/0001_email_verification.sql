ALTER TABLE "users"
  ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN "email_verification_token" text,
  ADD COLUMN "email_verification_expires_at" timestamp with time zone;
