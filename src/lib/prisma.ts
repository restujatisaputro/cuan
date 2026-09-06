import { PrismaClient } from "@prisma/client";

// Next.js melakukan hot-reload di mode dev sehingga instance PrismaClient bisa
// tercipta berulang kali. Simpan satu instance pada globalThis untuk mencegah
// kebocoran koneksi.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
