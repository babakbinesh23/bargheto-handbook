CREATE TABLE `handbook_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`section_key` text NOT NULL,
	`resource_key` text,
	`step` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `handbook_notifications_created_idx` ON `handbook_notifications` (`created_at`);--> statement-breakpoint
DROP INDEX `handbook_permissions_user_section_unique`;--> statement-breakpoint
ALTER TABLE `handbook_user_permissions` ADD `resource_key` text DEFAULT '*' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `handbook_permissions_user_section_resource_unique` ON `handbook_user_permissions` (`user_id`,`section_key`,`resource_key`);