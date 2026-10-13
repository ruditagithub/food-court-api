CREATE TABLE `dining_sessions` (
	`id` varchar(36) NOT NULL,
	`food_court_id` varchar(36) NOT NULL,
	`table_id` varchar(36),
	`kiosk_id` varchar(36),
	`session_code` varchar(20) NOT NULL,
	`order_type` enum('DINE_IN','TAKEAWAY') NOT NULL DEFAULT 'DINE_IN',
	`status` enum('ACTIVE','PAYMENT_PENDING','COMPLETED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`expired_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dining_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `dining_sessions_session_code_unique` UNIQUE(`session_code`)
);
--> statement-breakpoint
CREATE TABLE `food_courts` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`address` text,
	`phone` varchar(30),
	`logo` varchar(255),
	`status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `food_courts_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_courts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `kiosks` (
	`id` varchar(36) NOT NULL,
	`food_court_id` varchar(36) NOT NULL,
	`kiosk_name` varchar(100) NOT NULL,
	`device_code` varchar(100) NOT NULL,
	`location` varchar(100),
	`status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kiosks_id` PRIMARY KEY(`id`),
	CONSTRAINT `kiosks_device_code_unique` UNIQUE(`device_code`)
);
--> statement-breakpoint
CREATE TABLE `kitchen_queues` (
	`id` varchar(36) NOT NULL,
	`tenant_order_id` varchar(36) NOT NULL,
	`queue_number` varchar(20) NOT NULL,
	`status` enum('QUEUED','COOKING','READY','PICKED_UP') NOT NULL DEFAULT 'QUEUED',
	`queued_at` timestamp NOT NULL DEFAULT (now()),
	`started_at` timestamp,
	`finished_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kitchen_queues_id` PRIMARY KEY(`id`),
	CONSTRAINT `kitchen_queues_tenant_order_id_unique` UNIQUE(`tenant_order_id`)
);
--> statement-breakpoint
CREATE TABLE `menu_options` (
	`id` varchar(36) NOT NULL,
	`menu_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`price_adjustment` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_item_options` (
	`id` varchar(36) NOT NULL,
	`order_item_id` varchar(36) NOT NULL,
	`option_name_snapshot` varchar(120) NOT NULL,
	`price_adjustment_snapshot` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_item_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_logs` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`status` varchar(50) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_group_items` (
	`id` varchar(36) NOT NULL,
	`payment_group_id` varchar(36) NOT NULL,
	`order_item_id` varchar(36) NOT NULL,
	`allocated_amount` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_group_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_groups` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`participant_id` varchar(36) NOT NULL,
	`amount_due` int NOT NULL,
	`amount_paid` int NOT NULL DEFAULT 0,
	`status` enum('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_participants` (
	`id` varchar(36) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`name` varchar(120) NOT NULL,
	`device_token` varchar(255),
	`is_host` boolean NOT NULL DEFAULT false,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_orders` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`subtotal` int NOT NULL DEFAULT 0,
	`status` enum('WAITING_PAYMENT','QUEUED','PREPARING','READY','COMPLETED') NOT NULL DEFAULT 'WAITING_PAYMENT',
	`sent_to_kitchen_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
RENAME TABLE `categories` TO `menu_categories`;--> statement-breakpoint
ALTER TABLE `payments` DROP INDEX `payments_order_id_unique`;--> statement-breakpoint
ALTER TABLE `tables` DROP INDEX `tables_table_number_unique`;--> statement-breakpoint
ALTER TABLE `menu_categories` DROP FOREIGN KEY `categories_tenant_id_tenants_id_fk`;
--> statement-breakpoint
ALTER TABLE `menus` DROP FOREIGN KEY `menus_category_id_categories_id_fk`;
--> statement-breakpoint
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_order_id_orders_id_fk`;
--> statement-breakpoint
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_tenant_id_tenants_id_fk`;
--> statement-breakpoint
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_menu_id_menus_id_fk`;
--> statement-breakpoint
ALTER TABLE `orders` DROP FOREIGN KEY `orders_customer_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `orders` DROP FOREIGN KEY `orders_table_id_tables_id_fk`;
--> statement-breakpoint
ALTER TABLE `payments` DROP FOREIGN KEY `payments_order_id_orders_id_fk`;
--> statement-breakpoint
ALTER TABLE `menu_categories` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `menu_categories` MODIFY COLUMN `tenant_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_categories` MODIFY COLUMN `name` varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE `menus` MODIFY COLUMN `image_url` varchar(255);--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `menu_id` varchar(36);--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `order_number` varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `payment_method` enum('QRIS','CASH','CARD','E_WALLET','BANK_TRANSFER') NOT NULL DEFAULT 'QRIS';--> statement-breakpoint
ALTER TABLE `tables` MODIFY COLUMN `table_number` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `tables` MODIFY COLUMN `status` enum('available','occupied','disabled') NOT NULL DEFAULT 'available';--> statement-breakpoint
ALTER TABLE `tenants` MODIFY COLUMN `name` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `sort_order` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `menus` ADD `stock` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `menus` ADD `status` enum('AVAILABLE','OUT_OF_STOCK','HIDDEN') DEFAULT 'AVAILABLE' NOT NULL;--> statement-breakpoint
ALTER TABLE `menus` ADD `preparation_time` int DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `tenant_order_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `menu_name_snapshot` varchar(150) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `unit_price_snapshot` int NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `order_items` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `orders` ADD `session_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `subtotal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax_amount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `service_fee` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_amount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `total_amount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_status` enum('PENDING','PARTIALLY_PAID','PAID','REFUNDED') DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `order_status` enum('DRAFT','CONFIRMED','SENT_TO_KITCHEN','COMPLETED','CANCELLED') DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `payment_group_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `payment_reference` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `provider` varchar(50);--> statement-breakpoint
ALTER TABLE `payments` ADD `status` enum('PENDING','SUCCESS','FAILED','EXPIRED','REFUNDED') DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `expired_at` timestamp;--> statement-breakpoint
ALTER TABLE `payments` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `tables` ADD `food_court_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `tables` ADD `qr_token` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `tables` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `tenants` ADD `food_court_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `slug` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `logo` varchar(255);--> statement-breakpoint
ALTER TABLE `tenants` ADD `opening_time` varchar(8);--> statement-breakpoint
ALTER TABLE `tenants` ADD `closing_time` varchar(8);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_payment_reference_unique` UNIQUE(`payment_reference`);--> statement-breakpoint
ALTER TABLE `tables` ADD CONSTRAINT `tables_qr_token_unique` UNIQUE(`qr_token`);--> statement-breakpoint
ALTER TABLE `tables` ADD CONSTRAINT `uq_foodcourt_tablenumber` UNIQUE(`food_court_id`,`table_number`);--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `uq_foodcourt_slug` UNIQUE(`food_court_id`,`slug`);--> statement-breakpoint
ALTER TABLE `dining_sessions` ADD CONSTRAINT `dining_sessions_food_court_id_food_courts_id_fk` FOREIGN KEY (`food_court_id`) REFERENCES `food_courts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dining_sessions` ADD CONSTRAINT `dining_sessions_table_id_tables_id_fk` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dining_sessions` ADD CONSTRAINT `dining_sessions_kiosk_id_kiosks_id_fk` FOREIGN KEY (`kiosk_id`) REFERENCES `kiosks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kiosks` ADD CONSTRAINT `kiosks_food_court_id_food_courts_id_fk` FOREIGN KEY (`food_court_id`) REFERENCES `food_courts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kitchen_queues` ADD CONSTRAINT `kitchen_queues_tenant_order_id_tenant_orders_id_fk` FOREIGN KEY (`tenant_order_id`) REFERENCES `tenant_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_options` ADD CONSTRAINT `menu_options_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_item_options` ADD CONSTRAINT `order_item_options_order_item_id_order_items_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_logs` ADD CONSTRAINT `order_status_logs_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_group_items` ADD CONSTRAINT `payment_group_items_payment_group_id_payment_groups_id_fk` FOREIGN KEY (`payment_group_id`) REFERENCES `payment_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_group_items` ADD CONSTRAINT `payment_group_items_order_item_id_order_items_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_groups` ADD CONSTRAINT `payment_groups_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_groups` ADD CONSTRAINT `payment_groups_participant_id_session_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `session_participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_session_id_dining_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `dining_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_orders` ADD CONSTRAINT `tenant_orders_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_orders` ADD CONSTRAINT `tenant_orders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD CONSTRAINT `menu_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menus` ADD CONSTRAINT `menus_category_id_menu_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_tenant_order_id_tenant_orders_id_fk` FOREIGN KEY (`tenant_order_id`) REFERENCES `tenant_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_session_id_dining_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `dining_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_payment_group_id_payment_groups_id_fk` FOREIGN KEY (`payment_group_id`) REFERENCES `payment_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tables` ADD CONSTRAINT `tables_food_court_id_food_courts_id_fk` FOREIGN KEY (`food_court_id`) REFERENCES `food_courts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_food_court_id_food_courts_id_fk` FOREIGN KEY (`food_court_id`) REFERENCES `food_courts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `order_id`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `tenant_id`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `unit_price`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `item_status`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `special_notes`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `customer_id`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `customer_name`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `table_id`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `total_price`;--> statement-breakpoint
ALTER TABLE `payments` DROP COLUMN `order_id`;--> statement-breakpoint
ALTER TABLE `payments` DROP COLUMN `payment_status`;--> statement-breakpoint
ALTER TABLE `tables` DROP COLUMN `qr_code`;