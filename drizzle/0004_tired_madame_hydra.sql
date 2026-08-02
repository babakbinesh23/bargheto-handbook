CREATE TABLE `handbook_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `handbook_sessions_user_idx` ON `handbook_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `handbook_sessions_expires_idx` ON `handbook_sessions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `handbook_users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `handbook_users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `handbook_users` ADD `password_salt` text;--> statement-breakpoint
CREATE UNIQUE INDEX `handbook_users_username_unique` ON `handbook_users` (`username`);