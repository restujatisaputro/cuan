import "server-only";
import bcrypt from "bcryptjs";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  type Role,
} from "@/lib/constants";

/** Biaya bcrypt sesuai kebutuhan keamanan aplikasi. */
export const BCRYPT_COST = 12;

/**
 * Hash pembanding untuk email yang tidak ditemukan. Tujuannya menyamakan waktu
 * proses login sehingga penyerang tidak bisa menebak email mana yang terdaftar.
 */
const DUMMY_HASH = "$2b$12$Yq7t0Zk3Xw1p2rN9uS8vQeH4jL6mC0aB5dF7gJ9kM1nO3pQ5rS7uW";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}

export class EmailSudahDipakaiError extends Error {
  constructor() {
    super("Email sudah terdaftar");
    this.name = "EmailSudahDipakaiError";
  }
}

type BuatPenggunaInput = {
  name: string;
  email: string;
  password: string;
  /** Bila diisi, peran ini dipakai (dipakai admin saat menambah pengguna). */
  role?: Role;
};

/**
 * Membuat pengguna beserta data awal: akun bawaan dan kategori berbahasa
 * Indonesia. Pengguna pertama pada sistem otomatis menjadi ADMIN.
 *
 * Seluruh langkah berada dalam satu transaksi supaya tidak ada pengguna yang
 * terbuat tanpa akun/kategori bila terjadi galat di tengah jalan.
 */
export async function buatPenggunaBaru({
  name,
  email,
  password,
  role,
}: BuatPenggunaInput): Promise<User> {
  const passwordHash = await hashPassword(password);

  try {
    return await prisma.$transaction(async (tx) => {
      const jumlahPengguna = await tx.user.count();
      const peran: Role = role ?? (jumlahPengguna === 0 ? "ADMIN" : "USER");

      const user = await tx.user.create({
        data: { name, email, passwordHash, role: peran },
      });

      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map((account) => ({
          userId: user.id,
          name: account.name,
          type: account.type,
        })),
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          userId: user.id,
          name: category.name,
          kind: category.kind,
          icon: category.icon,
          color: category.color,
        })),
      });

      return user;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EmailSudahDipakaiError();
    }
    throw error;
  }
}

/** Mencari pengguna aktif berdasarkan email untuk proses login. */
export async function cariPenggunaUntukLogin(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });
}
