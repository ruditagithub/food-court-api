import { poolConnection } from "./index";

async function main() {
  console.log("Creating discounts table if not exists...");
  await poolConnection.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id VARCHAR(36) PRIMARY KEY,
      food_court_id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NULL,
      code VARCHAR(50) NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      scope ENUM('FOOD_COURT', 'TENANT') NOT NULL DEFAULT 'FOOD_COURT',
      type ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL DEFAULT 'PERCENTAGE',
      value INT NOT NULL,
      max_discount_amount INT NULL,
      min_order_amount INT NOT NULL DEFAULT 0,
      is_public BOOLEAN NOT NULL DEFAULT TRUE,
      usage_limit INT NULL,
      usage_count INT NOT NULL DEFAULT 0,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (food_court_id) REFERENCES food_courts(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);
  console.log("[OK] discounts table ready!");

  console.log("Adding discount_id column to orders table if not exists...");
  try {
    await poolConnection.query(`
      ALTER TABLE orders ADD COLUMN discount_id VARCHAR(36) NULL AFTER discount_amount;
    `);
    await poolConnection.query(`
      ALTER TABLE orders ADD CONSTRAINT fk_orders_discount_id FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE SET NULL;
    `);
    console.log("[OK] orders.discount_id column and foreign key added!");
  } catch (err: any) {
    if (
      err.code === "ER_DUP_FIELDNAME" ||
      err.message?.includes("Duplicate column")
    ) {
      console.log("[INFO] Kolom discount_id sudah ada di orders.");
    } else {
      console.warn("Warning adding discount_id to orders:", err.message);
    }
  }

  console.log("Adding discount_amount column to payment_groups table if not exists...");
  try {
    await poolConnection.query(`
      ALTER TABLE payment_groups ADD COLUMN discount_amount INT NOT NULL DEFAULT 0 AFTER amount_paid;
    `);
    console.log("[OK] payment_groups.discount_amount column added!");
  } catch (err: any) {
    if (
      err.code === "ER_DUP_FIELDNAME" ||
      err.message?.includes("Duplicate column")
    ) {
      console.log("[INFO] Kolom discount_amount sudah ada di payment_groups.");
    } else {
      console.warn("Warning adding discount_amount to payment_groups:", err.message);
    }
  }

  console.log("\n[OK] Discounts migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
