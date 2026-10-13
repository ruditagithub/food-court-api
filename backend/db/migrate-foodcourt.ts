import { poolConnection } from "./index";

async function main() {
  console.log("Mengupdate tipe ENUM kolom role pada tabel users...");
  await poolConnection.query(
    "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'admin-food-court', 'tenant', 'customer') NOT NULL DEFAULT 'customer'",
  );
  console.log("✅ users.role berhasil diperbarui!");

  console.log("Menambahkan kolom manager_id ke tabel food_courts...");
  try {
    await poolConnection.query(
      "ALTER TABLE `food_courts` ADD COLUMN `manager_id` VARCHAR(36) NULL AFTER `id`",
    );
    await poolConnection.query(
      "ALTER TABLE `food_courts` ADD CONSTRAINT `food_courts_manager_id_users_id_fk` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL",
    );
    console.log("✅ Kolom manager_id berhasil ditambahkan ke food_courts!");
  } catch (err: any) {
    if (
      err.code === "ER_DUP_FIELDNAME" ||
      err.message?.includes("Duplicate column")
    ) {
      console.log("ℹ️ Kolom manager_id sudah ada di food_courts.");
    } else {
      throw err;
    }
  }

  console.log("\n🚀 Sinkronisasi database selesai dengan aman tanpa menghapus data!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal menjalankan migrasi:", err);
  process.exit(1);
});
