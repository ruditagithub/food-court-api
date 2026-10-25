import { poolConnection } from "./index";

async function main() {
  console.log("Starting migration for wallet and withdrawal system...");

  // 1. Alter tenants table
  const tenantColumns = [
    {
      name: "balance",
      sql: "ALTER TABLE `tenants` ADD COLUMN `balance` INT NOT NULL DEFAULT 0 AFTER `closing_time`",
    },
    {
      name: "bank_name",
      sql: "ALTER TABLE `tenants` ADD COLUMN `bank_name` VARCHAR(50) NULL AFTER `balance`",
    },
    {
      name: "bank_account_number",
      sql: "ALTER TABLE `tenants` ADD COLUMN `bank_account_number` VARCHAR(50) NULL AFTER `bank_name`",
    },
    {
      name: "bank_account_holder",
      sql: "ALTER TABLE `tenants` ADD COLUMN `bank_account_holder` VARCHAR(100) NULL AFTER `bank_account_number`",
    },
  ];

  for (const col of tenantColumns) {
    try {
      await poolConnection.query(col.sql);
      console.log(`[OK] Column ${col.name} added to tenants`);
    } catch (err: any) {
      if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
        console.log(`[INFO] Column ${col.name} already exists in tenants`);
      } else {
        console.warn(`Notice on tenants.${col.name}:`, err.message);
      }
    }
  }

  // 2. Create withdrawal_requests table
  try {
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS \`withdrawal_requests\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`food_court_id\` VARCHAR(36) NOT NULL,
        \`tenant_id\` VARCHAR(36) NOT NULL,
        \`amount\` INT NOT NULL,
        \`payment_method\` ENUM('CASH', 'TRANSFER') NOT NULL,
        \`bank_name\` VARCHAR(50) NULL,
        \`bank_account_number\` VARCHAR(50) NULL,
        \`bank_account_holder\` VARCHAR(100) NULL,
        \`status\` ENUM('PENDING', 'PROCESSED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        \`proof_receipt_url\` VARCHAR(255) NULL,
        \`transfer_reference\` VARCHAR(100) NULL,
        \`admin_notes\` TEXT NULL,
        \`processed_by\` VARCHAR(36) NULL,
        \`requested_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`processed_at\` TIMESTAMP NULL,
        \`completed_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_withdrawal_foodcourt\` (\`food_court_id\`),
        INDEX \`idx_withdrawal_tenant\` (\`tenant_id\`),
        INDEX \`idx_withdrawal_status\` (\`status\`),
        CONSTRAINT \`fk_withdrawal_foodcourt\` FOREIGN KEY (\`food_court_id\`) REFERENCES \`food_courts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_withdrawal_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_withdrawal_user\` FOREIGN KEY (\`processed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("[OK] Table withdrawal_requests checked/created");
  } catch (err: any) {
    console.error("Error creating withdrawal_requests table:", err.message);
  }

  // 3. Create tenant_balance_logs table
  try {
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_balance_logs\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`tenant_id\` VARCHAR(36) NOT NULL,
        \`tenant_order_id\` VARCHAR(36) NULL,
        \`withdrawal_request_id\` VARCHAR(36) NULL,
        \`type\` ENUM('ORDER_REVENUE', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_REFUND', 'WITHDRAWAL_COMPLETED') NOT NULL,
        \`gross_amount\` INT NOT NULL DEFAULT 0,
        \`platform_fee\` INT NOT NULL DEFAULT 0,
        \`net_amount\` INT NOT NULL,
        \`balance_after\` INT NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_tbl_tenant\` (\`tenant_id\`),
        INDEX \`idx_tbl_tenant_order\` (\`tenant_order_id\`),
        INDEX \`idx_tbl_withdrawal_request\` (\`withdrawal_request_id\`),
        CONSTRAINT \`fk_tbl_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_tbl_tenant_order\` FOREIGN KEY (\`tenant_order_id\`) REFERENCES \`tenant_orders\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_tbl_withdrawal_request\` FOREIGN KEY (\`withdrawal_request_id\`) REFERENCES \`withdrawal_requests\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("[OK] Table tenant_balance_logs checked/created");
  } catch (err: any) {
    console.error("Error creating tenant_balance_logs table:", err.message);
  }

  console.log("\n[OK] Wallet and withdrawal migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
