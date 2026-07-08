CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_logs_gym_id_idx` ON `activity_logs` (`gym_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_user_id_idx` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_gym_user_idx` ON `activity_logs` (`gym_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`photo_url` text DEFAULT '' NOT NULL,
	`gender` text NOT NULL,
	`join_date` text NOT NULL,
	`training_access` text DEFAULT 'Gym & Bodybuilding' NOT NULL,
	`subscription_type` text NOT NULL,
	`subscription_plan_id` text,
	`subscription_duration_months` integer DEFAULT 1 NOT NULL,
	`subscription_start` text NOT NULL,
	`subscription_end` text NOT NULL,
	`assurance_fee` real DEFAULT 200 NOT NULL,
	`assurance_start` text,
	`assurance_end` text,
	`assurance_payment_status` text DEFAULT 'Unpaid' NOT NULL,
	`offer_id` text,
	`payment_status` text NOT NULL,
	`last_payment_date` text,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`staff_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `clients_gym_id_idx` ON `clients` (`gym_id`);--> statement-breakpoint
CREATE INDEX `clients_full_name_idx` ON `clients` (`full_name`);--> statement-breakpoint
CREATE INDEX `clients_staff_id_idx` ON `clients` (`staff_id`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'Operational' NOT NULL,
	`last_maintenance_date` text,
	`next_maintenance_date` text,
	`repair_cost` real DEFAULT 0 NOT NULL,
	`supplier_name` text DEFAULT '' NOT NULL,
	`supplier_phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `equipment_gym_id_idx` ON `equipment` (`gym_id`);--> statement-breakpoint
CREATE INDEX `equipment_status_idx` ON `equipment` (`status`);--> statement-breakpoint
CREATE INDEX `equipment_next_maintenance_idx` ON `equipment` (`next_maintenance_date`);--> statement-breakpoint
CREATE TABLE `gyms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`monthly_price` real DEFAULT 45 NOT NULL,
	`annual_price` real DEFAULT 480 NOT NULL,
	`reminder_days` integer DEFAULT 7 NOT NULL,
	`currency` text DEFAULT 'MAD' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`target_subscriptions` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `offers_gym_id_idx` ON `offers` (`gym_id`);--> statement-breakpoint
CREATE INDEX `offers_status_idx` ON `offers` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`client_id` text NOT NULL,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`staff_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_gym_id_idx` ON `payments` (`gym_id`);--> statement-breakpoint
CREATE INDEX `payments_client_id_idx` ON `payments` (`client_id`);--> statement-breakpoint
CREATE INDEX `payments_gym_client_idx` ON `payments` (`gym_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `payments_staff_id_idx` ON `payments` (`staff_id`);--> statement-breakpoint
CREATE TABLE `reminder_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`client_id` text NOT NULL,
	`email` text NOT NULL,
	`sent_at` text NOT NULL,
	`due_date` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`name` text NOT NULL,
	`permissions` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `roles_gym_id_idx` ON `roles` (`gym_id`);--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`name` text NOT NULL,
	`duration_months` integer NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `subscription_plans_gym_id_idx` ON `subscription_plans` (`gym_id`);--> statement-breakpoint
CREATE INDEX `subscription_plans_status_idx` ON `subscription_plans` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`role_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);