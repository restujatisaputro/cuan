/**
 * Mencadangkan basis data SQLite ke folder backup bertanggal.
 *
 * Jalankan: npm run db:backup
 * Folder tujuan diambil dari BACKUP_DIR (default: ./backup).
 *
 * Memakai `VACUUM INTO`, bukan penyalinan berkas.
 *
 * Menyalin berkas basis data yang sedang hidup tidak pernah benar-benar aman:
 * penyalinan bukan operasi atomik, sehingga isinya bisa berubah di tengah jalan
 * dan menghasilkan salinan yang separuh lama separuh baru. Sejak journal_mode
 * diubah ke WAL, masalahnya bertambah -- transaksi terbaru tinggal di berkas
 * -wal, jadi menyalin cuan.db, cuan.db-wal, dan cuan.db-shm satu per satu
 * berarti tiga potret pada tiga saat yang berbeda.
 *
 * `VACUUM INTO` menyelesaikan keduanya sekaligus: SQLite membaca basis data
 * dalam satu transaksi sehingga hasilnya konsisten pada satu titik waktu, isi
 * -wal sudah ikut termuat, dan keluarannya satu berkas mandiri yang rapat tanpa
 * halaman kosong. Aplikasi tidak perlu dihentikan.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/** DATABASE_URL bergaya "file:../data/cuan.db" relatif terhadap folder prisma/. */
function resolveDatabaseFile(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diisi. Salin .env.example menjadi .env.");
  }
  if (!url.startsWith("file:")) {
    throw new Error(
      `db:backup hanya untuk SQLite. DATABASE_URL saat ini: ${url.split(":")[0]}:`,
    );
  }
  const raw = url.slice("file:".length);
  return path.isAbsolute(raw)
    ? raw
    : path.resolve(process.cwd(), "prisma", raw);
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

async function main(): Promise<void> {
  const source = resolveDatabaseFile();
  if (!existsSync(source)) {
    throw new Error(`Berkas basis data tidak ditemukan: ${source}`);
  }

  const backupDir = path.resolve(
    process.cwd(),
    process.env.BACKUP_DIR ?? "./backup",
  );
  await mkdir(backupDir, { recursive: true });

  const stamp = timestamp();
  const baseName = path.basename(source, path.extname(source));
  const target = path.join(backupDir, `${baseName}-${stamp}.db`);

  // VACUUM INTO menolak menimpa: berkas tujuan harus belum ada.
  if (existsSync(target)) {
    throw new Error(`Berkas tujuan sudah ada: ${target}`);
  }

  const prisma = new PrismaClient();
  try {
    // Jalur ditanam sebagai literal karena VACUUM INTO tidak menerima parameter
    // terikat. Nilainya berasal dari BACKUP_DIR milik operator, bukan dari
    // masukan pengguna; kutip tunggal digandakan sesuai aturan literal SQL.
    const literal = target.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${literal}'`);
  } finally {
    await prisma.$disconnect();
  }

  const { size } = await stat(target);
  const asal = await stat(source);
  const files = (await readdir(backupDir)).filter((name) => name.endsWith(".db"));
  console.log(
    `Backup dibuat: ${target} (${(size / 1024).toFixed(1)} KB` +
      ` dari ${(asal.size / 1024).toFixed(1)} KB)`,
  );
  console.log(`Total salinan di ${backupDir}: ${files.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
