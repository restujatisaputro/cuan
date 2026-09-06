/**
 * Pemeriksaan cepat isi basis data hasil seed:
 * saldo per akun, arus kas, dan isolasi data antar pengguna.
 *
 * Jalankan: npx tsx --env-file=.env scripts/verify-seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatRupiah, roundToMoney } from "../src/lib/money";

const prisma = new PrismaClient();

async function ringkasPengguna(userId: string, nama: string): Promise<void> {
  const accounts = await prisma.account.findMany({ where: { userId } });

  console.log(`\n=== ${nama} ===`);
  let totalKas = 0n;

  for (const account of accounts) {
    const [keluar, masuk, transferKeluar, transferMasuk] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, accountId: account.id, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, accountId: account.id, type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, accountId: account.id, type: "TRANSFER" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, toAccountId: account.id, type: "TRANSFER" },
        _sum: { amount: true },
      }),
    ]);

    const saldo =
      account.openingBalance +
      (masuk._sum.amount ?? 0n) -
      (keluar._sum.amount ?? 0n) -
      (transferKeluar._sum.amount ?? 0n) +
      (transferMasuk._sum.amount ?? 0n);

    if (account.type !== "INVESTMENT") totalKas += saldo;
    console.log(
      `  ${account.name.padEnd(22)} ${account.type.padEnd(11)} ${formatRupiah(saldo).padStart(18)}`,
    );
  }

  const [income, expense, transfer] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "TRANSFER" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const assets = await prisma.investmentAsset.findMany({ where: { userId } });
  const nilaiInvestasi = assets.reduce(
    (total, asset) => total + roundToMoney(asset.units.mul(asset.lastPrice).toNumber()),
    0n,
  );
  const modalInvestasi = assets.reduce(
    (total, asset) => total + roundToMoney(asset.units.mul(asset.avgCost).toNumber()),
    0n,
  );

  const debts = await prisma.debt.findMany({
    where: { userId },
    include: { payments: true },
  });
  let sisaUtang = 0n;
  let sisaPiutang = 0n;
  for (const debt of debts) {
    const pokokTerbayar = debt.payments.reduce(
      (total, payment) => total + payment.principalPortion,
      0n,
    );
    const sisa = debt.principal - pokokTerbayar;
    if (debt.direction === "PAYABLE") sisaUtang += sisa;
    else sisaPiutang += sisa;
  }

  console.log(
    `  Pemasukan  : ${formatRupiah(income._sum.amount ?? 0n)} (${income._count} transaksi)`,
  );
  console.log(
    `  Pengeluaran: ${formatRupiah(expense._sum.amount ?? 0n)} (${expense._count} transaksi)`,
  );
  console.log(
    `  Transfer   : ${formatRupiah(transfer._sum.amount ?? 0n)} (${transfer._count} transaksi, tidak masuk arus kas)`,
  );
  console.log(`  Total saldo kas    : ${formatRupiah(totalKas)}`);
  console.log(
    `  Nilai investasi    : ${formatRupiah(nilaiInvestasi)} (modal ${formatRupiah(modalInvestasi)})`,
  );
  console.log(`  Sisa utang         : ${formatRupiah(sisaUtang)}`);
  console.log(`  Sisa piutang       : ${formatRupiah(sisaPiutang)}`);
  console.log(
    `  Kekayaan bersih    : ${formatRupiah(totalKas + nilaiInvestasi + sisaPiutang - sisaUtang)}`,
  );
}

async function main(): Promise<void> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  for (const user of users) {
    await ringkasPengguna(user.id, `${user.name} <${user.email}> [${user.role}]`);
  }

  console.log("\n=== Uji isolasi data ===");
  const [budi, rina] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "budi@cuan.id" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "rina@cuan.id" } }),
  ]);

  const milikBudiDilihatRina = await prisma.transaction.count({
    where: { userId: rina.id, account: { userId: budi.id } },
  });
  const totalBudi = await prisma.transaction.count({ where: { userId: budi.id } });
  const totalRina = await prisma.transaction.count({ where: { userId: rina.id } });

  console.log(`  Transaksi Budi: ${totalBudi}, transaksi Rina: ${totalRina}`);
  console.log(
    `  Baris milik Budi yang cocok dengan filter userId Rina: ${milikBudiDilihatRina} (harus 0)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
