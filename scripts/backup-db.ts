/**
 * Menyalin berkas basis data SQLite ke folder backup bertanggal.
 *
 * Jalankan: npm run db:backup
 * Folder tujuan diambil dari BACKUP_DIR (default: ./backup).
 */
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

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
  await copyFile(source, target);

  // Salin juga berkas WAL/SHM bila ada supaya salinan tetap konsisten.
  for (const suffix of ["-wal", "-shm"]) {
    const extra = `${source}${suffix}`;
    if (existsSync(extra)) {
      await copyFile(extra, `${target}${suffix}`);
    }
  }

  const { size } = await stat(target);
  const files = (await readdir(backupDir)).filter((name) => name.endsWith(".db"));
  console.log(`Backup dibuat: ${target} (${(size / 1024).toFixed(1)} KB)`);
  console.log(`Total salinan di ${backupDir}: ${files.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
