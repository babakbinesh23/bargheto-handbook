CREATE TABLE `handbook_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`section_key` text,
	`summary` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `handbook_audit_created_idx` ON `handbook_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `handbook_user_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`section_key` text NOT NULL,
	`can_edit_text` integer DEFAULT false NOT NULL,
	`can_edit_image` integer DEFAULT false NOT NULL,
	`can_manage_items` integer DEFAULT false NOT NULL,
	`can_reorder` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `handbook_permissions_user_section_unique` ON `handbook_user_permissions` (`user_id`,`section_key`);--> statement-breakpoint
CREATE INDEX `handbook_permissions_user_idx` ON `handbook_user_permissions` (`user_id`);--> statement-breakpoint
CREATE TABLE `handbook_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `handbook_users_email_unique` ON `handbook_users` (`email`);