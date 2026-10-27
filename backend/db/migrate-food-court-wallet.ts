import { poolConnection } from "./index";

async function main() {
  console.log("Starting migration for Food Court wallet and platform fee reallocation...");

  // 1. Alter food_courts table
  const foodCourtColumns = [
    {
      name: "balance",
      sql: "ALTER TABLE `food_courts` ADD COLUMN `balance` INT NOT NULL DEFAULT 0 AFTER `status`",
    },
    {
      name: "bank_name",
      sql: "ALTER TABLE `food_courts` ADD COLUMN `bank_name` VARCHAR(50) NULL AFTER `balance`",
    },
    {
      name: "bank_account_number",
      sql: "ALTER TABLE `food_courts` ADD COLUMN `bank_account_number` VARCHAR(50) NULL AFTER `bank_name`",
    },
    {
      name: "bank_account_holder",
      sql: "ALTER TABLE `food_courts` ADD COLUMN `bank_account_holder` VARCHAR(100) NULL AFTER `bank_account_number`",
    },
  ];

  for (const col of foodCourtColumns) {
    try {
      await poolConnection.query(col.sql);
      console.log(`[OK] Column ${col.name} added to food_courts`);
    } catch (err: any) {
      if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
        console.log(`[INFO] Column ${col.name} already exists in food_courts`);
      } else {
        console.warn(`Notice on food_courts.${col.name}:`, err.message);
      }
    }
  }

  // 2. Create food_court_withdrawals table
  try {
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS \`food_court_withdrawals\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`food_court_id\` VARCHAR(36) NOT NULL,
        \`amount\` INT NOT NULL,
        \`payment_method\` ENUM('TRANSFER') NOT NULL DEFAULT 'TRANSFER',
        \`bank_name\` VARCHAR(50) NOT NULL,
        \`bank_account_number\` VARCHAR(50) NOT NULL,
        \`bank_account_holder\` VARCHAR(100) NOT NULL,
        \`status\` ENUM('PENDING', 'PROCESSED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        \`proof_receipt_url\` VARCHAR(255) NULL,
        \`transfer_reference\` VARCHAR(100) NULL,
        \`admin_notes\` TEXT NULL,
        \`requested_by\` VARCHAR(36) NULL,
        \`processed_by\` VARCHAR(36) NULL,
        \`requested_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`processed_at\` TIMESTAMP NULL,
        \`completed_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_fc_withdrawal_foodcourt\` (\`food_court_id\`),
        INDEX \`idx_fc_withdrawal_status\` (\`status\`),
        CONSTRAINT \`fk_fc_withdrawal_foodcourt\` FOREIGN KEY (\`food_court_id\`) REFERENCES \`food_courts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_fc_withdrawal_requester\` FOREIGN KEY (\`requested_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_fc_withdrawal_processor\` FOREIGN KEY (\`processed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("[OK] Table food_court_withdrawals checked/created");
  } catch (err: any) {
    console.error("Error creating food_court_withdrawals table:", err.message);
  }

  // 3. Create food_court_balance_logs table
  try {
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS \`food_court_balance_logs\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`food_court_id\` VARCHAR(36) NOT NULL,
        \`order_id\` VARCHAR(36) NULL,
        \`withdrawal_id\` VARCHAR(36) NULL,
        \`type\` ENUM('ORDER_SETTLEMENT', 'ADJUSTMENT', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_REFUND', 'WITHDRAWAL_COMPLETED') NOT NULL,
        \`subtotal_amount\` INT NOT NULL DEFAULT 0,
        \`service_fee\` INT NOT NULL DEFAULT 0,
        \`tax_amount\` INT NOT NULL DEFAULT 0,
        \`platform_fee\` INT NOT NULL DEFAULT 0,
        \`net_amount\` INT NOT NULL,
        \`balance_after\` INT NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_fc_log_foodcourt\` (\`food_court_id\`),
        INDEX \`idx_fc_log_order\` (\`order_id\`),
        INDEX \`idx_fc_log_withdrawal\` (\`withdrawal_id\`),
        CONSTRAINT \`fk_fc_log_foodcourt\` FOREIGN KEY (\`food_court_id\`) REFERENCES \`food_courts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_fc_log_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_fc_log_withdrawal\` FOREIGN KEY (\`withdrawal_id\`) REFERENCES \`food_court_withdrawals\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("[OK] Table food_court_balance_logs checked/created");
  } catch (err: any) {
    console.error("Error creating food_court_balance_logs table:", err.message);
  }

  // 4. Update tenant_balance_logs type enum to allow ADJUSTMENT
  try {
    await poolConnection.query(`
      ALTER TABLE \`tenant_balance_logs\` 
      MODIFY COLUMN \`type\` ENUM('ORDER_REVENUE', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_REFUND', 'WITHDRAWAL_COMPLETED', 'ADJUSTMENT') NOT NULL;
    `);
    console.log("[OK] Column type in tenant_balance_logs updated to include ADJUSTMENT");
  } catch (err: any) {
    console.warn("Notice on tenant_balance_logs.type alter:", err.message);
  }

  console.log("\n[OK] Food court wallet migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
