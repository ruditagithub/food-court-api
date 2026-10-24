import { poolConnection } from "./index";

async function main() {
  console.log("Checking and updating users table for activation fields...");
  try {
    await poolConnection.query(
      "ALTER TABLE `users` ADD COLUMN `status` ENUM('ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER `role`"
    );
    console.log("[OK] Column status added to users");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
      console.log("[INFO] Column status already exists in users");
    } else {
      console.warn("Notice on users.status:", err.message);
    }
  }

  try {
    await poolConnection.query(
      "ALTER TABLE `users` ADD COLUMN `activation_token` VARCHAR(255) NULL AFTER `status`"
    );
    console.log("[OK] Column activation_token added to users");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
      console.log("[INFO] Column activation_token already exists in users");
    } else {
      console.warn("Notice on users.activation_token:", err.message);
    }
  }

  try {
    await poolConnection.query(
      "ALTER TABLE `users` ADD COLUMN `activation_expires` TIMESTAMP NULL AFTER `activation_token`"
    );
    console.log("[OK] Column activation_expires added to users");
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
      console.log("[INFO] Column activation_expires already exists in users");
    } else {
      console.warn("Notice on users.activation_expires:", err.message);
    }
  }

  console.log("Checking and adding unique constraint on tenants.owner_id...");
  try {
    await poolConnection.query(
      "ALTER TABLE `tenants` ADD CONSTRAINT `uq_tenant_owner_id` UNIQUE (`owner_id`)"
    );
    console.log("[OK] Unique constraint uq_tenant_owner_id added to tenants!");
  } catch (err: any) {
    if (err.code === "ER_DUP_KEYNAME" || err.message?.includes("Duplicate key")) {
      console.log("[INFO] Unique constraint uq_tenant_owner_id already exists.");
    } else {
      console.warn("Notice on uq_tenant_owner_id:", err.message);
    }
  }

  console.log("\n[OK] Migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
