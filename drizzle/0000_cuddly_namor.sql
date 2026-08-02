CREATE TABLE `handbook_content` (
	`id` integer PRIMARY KEY NOT NULL,
	`welcome_title` text DEFAULT 'به برقتو خوش آمدید' NOT NULL,
	`about_title` text DEFAULT 'برقتو چه مسئله‌ای را حل می‌کند؟' NOT NULL,
	`about_body` text DEFAULT '' NOT NULL,
	`sales_title` text DEFAULT 'مسیر نمونه واحد فروش' NOT NULL,
	`sales_body` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
