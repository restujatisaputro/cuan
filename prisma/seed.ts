/**
 * Seed data contoh.
 *
 * Jalankan: npm run db:seed
 *
 * Password akun contoh diambil dari variabel lingkungan SEED_PASSWORD.
 * Bila tidak diisi, seed membuat password acak dan menampilkannya sekali di
 * konsol (tidak ada password polos yang tersimpan di dalam repositori).
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  DEFAULT_CATEGORIES,
  INVESTMENT_ACCOUNT_NAME,
} from "../src/lib/constants";
import { roundToMoney } from "../src/lib/money";
import { hitungPosisi } from "../src/lib/finance/portfolio";

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

/** PRNG deterministik supaya hasil seed selalu sama. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260906);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)];
}

/** Tanggal kalender Jakarta disimpan sebagai tengah malam UTC. */
function d(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

async function resolvePassword(): Promise<{ plain: string; generated: boolean }> {
  const fromEnv = process.env.SEED_PASSWORD;
  if (fromEnv && fromEnv.length >= 8) {
    return { plain: fromEnv, generated: false };
  }
  return { plain: randomBytes(9).toString("base64url"), generated: true };
}

type SeededUser = {
  id: string;
  accounts: Record<string, string>;
  categories: Record<string, string>;
};

async function createUser(
  name: string,
  email: string,
  role: "ADMIN" | "USER",
  passwordHash: string,
  accounts: ReadonlyArray<{ name: string; type: string; openingBalance: bigint }>,
): Promise<SeededUser> {
  const user = await prisma.user.create({
    data: { name, email, role, passwordHash },
  });

  const accountIds: Record<string, string> = {};
  for (const account of accounts) {
    const created = await prisma.account.create({
      data: {
        userId: user.id,
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
      },
    });
    accountIds[account.name] = created.id;
  }

  const categoryIds: Record<string, string> = {};
  for (const category of DEFAULT_CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: category.name,
        kind: category.kind,
        icon: category.icon,
        color: category.color,
      },
    });
    categoryIds[category.name] = created.id;
  }

  return { id: user.id, accounts: accountIds, categories: categoryIds };
}

/** Pola pengeluaran bulanan yang wajar untuk data contoh. */
const EXPENSE_PATTERN: ReadonlyArray<{
  category: string;
  count: [number, number];
  amount: [number, number];
  notes: readonly string[];
}> = [
  {
    category: "Makan & Minum",
    count: [8, 12],
    amount: [15_000, 120_000],
    notes: ["Makan siang", "Kopi", "Belanja sayur", "Makan keluarga", "Sarapan"],
  },
  {
    category: "Transportasi",
    count: [4, 7],
    amount: [12_000, 150_000],
    notes: ["Bensin", "Ojek online", "Parkir", "Tol", "Servis motor"],
  },
  {
    category: "Belanja",
    count: [2, 4],
    amount: [50_000, 700_000],
    notes: ["Peralatan rumah", "Baju", "Perlengkapan mandi"],
  },
  {
    category: "Tagihan",
    count: [3, 4],
    amount: [90_000, 850_000],
    notes: ["Listrik", "Internet", "Air", "Pulsa"],
  },
  {
    category: "Kesehatan",
    count: [0, 2],
    amount: [50_000, 450_000],
    notes: ["Obat", "Periksa dokter", "Vitamin"],
  },
  {
    category: "Pendidikan",
    count: [0, 1],
    amount: [150_000, 900_000],
    notes: ["Kursus daring", "Buku"],
  },
  {
    category: "Hiburan",
    count: [1, 3],
    amount: [40_000, 300_000],
    notes: ["Bioskop", "Langganan streaming", "Jalan-jalan"],
  },
  {
    category: "Lain-lain",
    count: [0, 2],
    amount: [25_000, 250_000],
    notes: ["Donasi", "Kado", "Iuran warga"],
  },
];

async function seedDemoData(user: SeededUser, today: Date): Promise<void> {
  const monthsBack = 8;
  const transactions: Prisma.TransactionCreateManyInput[] = [];

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1),
    );
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const lastDay =
      offset === 0
        ? today.getUTCDate()
        : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    // Gaji tanggal 25 (atau tanggal terakhir yang tersedia pada bulan berjalan).
    if (lastDay >= 25 || offset > 0) {
      transactions.push({
        userId: user.id,
        date: d(year, month, Math.min(25, lastDay)),
        type: "INCOME",
        amount: 12_500_000n,
        accountId: user.accounts["Bank BCA"],
        categoryId: user.categories["Gaji"],
        note: "Gaji bulanan",
        tags: "rutin",
      });
    }

    // Bonus sesekali.
    if (offset % 3 === 0 && lastDay >= 10) {
      transactions.push({
        userId: user.id,
        date: d(year, month, 10),
        type: "INCOME",
        amount: BigInt(randInt(1_000_000, 3_500_000)),
        accountId: user.accounts["Bank BCA"],
        categoryId: user.categories["Bonus"],
        note: "Bonus proyek",
      });
    }

    // Tarik tunai: transfer bank ke dompet, tidak dihitung sebagai pengeluaran.
    if (lastDay >= 5) {
      transactions.push({
        userId: user.id,
        date: d(year, month, 5),
        type: "TRANSFER",
        amount: 3_000_000n,
        accountId: user.accounts["Bank BCA"],
        toAccountId: user.accounts["Kas/Dompet"],
        note: "Tarik tunai",
      });
    }

    for (const pattern of EXPENSE_PATTERN) {
      const count = randInt(pattern.count[0], pattern.count[1]);
      for (let i = 0; i < count; i += 1) {
        const day = randInt(1, lastDay);
        const fromCash = rand() < 0.45;
        const ribuan = Math.round(
          randInt(pattern.amount[0], pattern.amount[1]) / 1000,
        );
        transactions.push({
          userId: user.id,
          date: d(year, month, day),
          type: "EXPENSE",
          amount: BigInt(ribuan) * 1_000n,
          accountId: fromCash
            ? user.accounts["Kas/Dompet"]
            : user.accounts["Bank BCA"],
          categoryId: user.categories[pattern.category],
          note: pick(pattern.notes),
        });
      }
    }
  }

  await prisma.transaction.createMany({ data: transactions });
}

async function seedDebts(user: SeededUser, today: Date): Promise<void> {
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 5),
  );

  // Utang dengan bunga anuitas 12% per tahun, tenor 12 bulan.
  const principal = 24_000_000n;
  const tenor = 12;
  const monthlyRate = 0.12 / 12;
  const installment = roundToMoney(
    (Number(principal) * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -tenor)),
  );

  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      direction: "PAYABLE",
      counterparty: "Koperasi Sejahtera",
      principal,
      interestRateBps: 1200,
      interestType: "ANNUITY",
      startDate: start,
      dueDate: new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + tenor, 5),
      ),
      tenorMonths: tenor,
      status: "AKTIF",
      note: "Renovasi rumah",
    },
  });

  let outstanding = principal;
  for (let i = 1; i <= 3; i += 1) {
    const paymentDate = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 5),
    );
    if (paymentDate > today) break;

    const interestPortion = roundToMoney(Number(outstanding) * monthlyRate);
    const principalPortion = installment - interestPortion;
    outstanding -= principalPortion;

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        date: paymentDate,
        type: "EXPENSE",
        amount: installment,
        accountId: user.accounts["Bank BCA"],
        categoryId: user.categories["Tagihan"],
        note: `Cicilan ${debt.counterparty} ke-${i}`,
        tags: "cicilan",
      },
    });

    await prisma.debtPayment.create({
      data: {
        debtId: debt.id,
        date: paymentDate,
        amount: installment,
        principalPortion,
        interestPortion,
        transactionId: transaction.id,
      },
    });
  }

  // Piutang tanpa bunga.
  await prisma.debt.create({
    data: {
      userId: user.id,
      direction: "RECEIVABLE",
      counterparty: "Andi",
      principal: 3_000_000n,
      interestRateBps: 0,
      interestType: "NONE",
      startDate: new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 12),
      ),
      dueDate: new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 12),
      ),
      tenorMonths: 3,
      status: "AKTIF",
      note: "Pinjaman teman",
    },
  });
}

async function seedSavings(user: SeededUser, today: Date): Promise<void> {
  const goal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: "Dana Darurat",
      targetAmount: 30_000_000n,
      targetDate: new Date(
        Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), 1),
      ),
      accountId: user.accounts["Tabungan"],
      status: "AKTIF",
    },
  });

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 26),
    );
    if (date > today) continue;

    const amount = 1_500_000n;
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        date,
        type: "TRANSFER",
        amount,
        accountId: user.accounts["Bank BCA"],
        toAccountId: user.accounts["Tabungan"],
        note: "Setoran dana darurat",
        tags: "tabungan",
      },
    });

    await prisma.savingsContribution.create({
      data: { goalId: goal.id, date, amount, transactionId: transaction.id },
    });
  }
}

async function seedInvestments(user: SeededUser, today: Date): Promise<void> {
  const portfolioAccountId = user.accounts[INVESTMENT_ACCOUNT_NAME];

  const assets = [
    {
      name: "Reksa Dana Pasar Uang Bibit",
      type: "MUTUAL_FUND",
      ticker: "RDPU",
      lastPrice: "1287.4521",
      buys: [
        { monthsAgo: 6, units: "2000", price: "1201.3345" },
        { monthsAgo: 3, units: "1500", price: "1243.8812" },
      ],
    },
    {
      name: "Bank Central Asia",
      type: "STOCK",
      ticker: "BBCA",
      lastPrice: "10250",
      buys: [
        { monthsAgo: 7, units: "200", price: "9350" },
        { monthsAgo: 2, units: "100", price: "9875" },
      ],
    },
    {
      name: "Emas Antam",
      type: "GOLD",
      ticker: null,
      lastPrice: "1425000",
      buys: [{ monthsAgo: 4, units: "5", price: "1310000" }],
    },
  ] as const;

  for (const asset of assets) {
    const created = await prisma.investmentAsset.create({
      data: {
        userId: user.id,
        name: asset.name,
        type: asset.type,
        ticker: asset.ticker,
        lastPrice: asset.lastPrice,
        lastPriceUpdatedAt: today,
      },
    });

    const riwayat: {
      action: "BUY";
      units: string;
      pricePerUnit: string;
      fee: bigint;
      amount: bigint;
    }[] = [];

    for (const buy of asset.buys) {
      const date = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - buy.monthsAgo, 15),
      );
      const units = new Prisma.Decimal(buy.units);
      const price = new Prisma.Decimal(buy.price);
      const fee = 5_000n;
      const amount = roundToMoney(units.mul(price).toNumber()) + fee;

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          date,
          type: "TRANSFER",
          amount,
          accountId: user.accounts["Bank BCA"],
          toAccountId: portfolioAccountId,
          note: `Pembelian ${asset.name}`,
          tags: "investasi",
        },
      });

      await prisma.investmentTx.create({
        data: {
          assetId: created.id,
          date,
          action: "BUY",
          units: units.toString(),
          pricePerUnit: price.toString(),
          fee,
          amount,
          transactionId: transaction.id,
        },
      });

      riwayat.push({
        action: "BUY",
        units: units.toString(),
        pricePerUnit: price.toString(),
        fee,
        amount,
      });
    }

    // Posisi dihitung dengan fungsi yang sama seperti aplikasi, sehingga biaya
    // transaksi ikut masuk ke harga perolehan rata-rata.
    const posisi = hitungPosisi(riwayat);
    await prisma.investmentAsset.update({
      where: { id: created.id },
      data: {
        units: posisi.units.toString(),
        avgCost: posisi.avgCost.toDecimalPlaces(6).toString(),
      },
    });
  }
}

async function seedBudgets(user: SeededUser, today: Date): Promise<void> {
  const period = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const budgets: ReadonlyArray<[string, bigint]> = [
    ["Makan & Minum", 2_500_000n],
    ["Transportasi", 1_000_000n],
    ["Belanja", 1_500_000n],
    ["Tagihan", 2_000_000n],
    ["Hiburan", 500_000n],
  ];

  await prisma.budget.createMany({
    data: budgets.map(([category, amount]) => ({
      userId: user.id,
      categoryId: user.categories[category],
      period,
      amount,
    })),
  });
}

async function main(): Promise<void> {
  const { plain, generated } = await resolvePassword();
  const passwordHash = await bcrypt.hash(plain, BCRYPT_COST);
  const emails = ["admin@cuan.id", "budi@cuan.id", "rina@cuan.id"];

  // Seed idempoten: hapus pengguna contoh beserta seluruh datanya.
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  const now = new Date();
  const today = d(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const admin = await createUser(
    "Administrator",
    "admin@cuan.id",
    "ADMIN",
    passwordHash,
    [
      { name: "Kas/Dompet", type: "CASH", openingBalance: 500_000n },
      { name: "Bank BCA", type: "BANK", openingBalance: 7_500_000n },
    ],
  );

  await prisma.transaction.createMany({
    data: [
      {
        userId: admin.id,
        date: d(today.getUTCFullYear(), today.getUTCMonth(), 1),
        type: "EXPENSE",
        amount: 250_000n,
        accountId: admin.accounts["Kas/Dompet"],
        categoryId: admin.categories["Makan & Minum"],
        note: "Transaksi milik admin",
      },
    ],
  });

  const budi = await createUser("Budi Santoso", "budi@cuan.id", "USER", passwordHash, [
    { name: "Kas/Dompet", type: "CASH", openingBalance: 750_000n },
    { name: "Bank BCA", type: "BANK", openingBalance: 12_500_000n },
    { name: "OVO", type: "EWALLET", openingBalance: 250_000n },
    { name: "Tabungan", type: "BANK", openingBalance: 0n },
    { name: INVESTMENT_ACCOUNT_NAME, type: "INVESTMENT", openingBalance: 0n },
  ]);

  await seedDemoData(budi, today);
  await seedDebts(budi, today);
  await seedSavings(budi, today);
  await seedInvestments(budi, today);
  await seedBudgets(budi, today);

  const rina = await createUser("Rina Kurnia", "rina@cuan.id", "USER", passwordHash, [
    { name: "Kas/Dompet", type: "CASH", openingBalance: 1_000_000n },
    { name: "Bank Mandiri", type: "BANK", openingBalance: 4_000_000n },
  ]);

  await prisma.transaction.createMany({
    data: [
      {
        userId: rina.id,
        date: d(today.getUTCFullYear(), today.getUTCMonth(), 2),
        type: "INCOME",
        amount: 6_000_000n,
        accountId: rina.accounts["Bank Mandiri"],
        categoryId: rina.categories["Gaji"],
        note: "Gaji Rina",
      },
      {
        userId: rina.id,
        date: d(today.getUTCFullYear(), today.getUTCMonth(), 3),
        type: "EXPENSE",
        amount: 425_000n,
        accountId: rina.accounts["Kas/Dompet"],
        categoryId: rina.categories["Belanja"],
        note: "Belanja bulanan",
      },
    ],
  });

  const counts = {
    pengguna: await prisma.user.count(),
    akun: await prisma.account.count(),
    kategori: await prisma.category.count(),
    transaksi: await prisma.transaction.count(),
    utang: await prisma.debt.count(),
    cicilan: await prisma.debtPayment.count(),
    tabungan: await prisma.savingsGoal.count(),
    setoran: await prisma.savingsContribution.count(),
    aset: await prisma.investmentAsset.count(),
    transaksiInvestasi: await prisma.investmentTx.count(),
    anggaran: await prisma.budget.count(),
  };

  console.log("Seed selesai:", counts);
  console.log("Akun contoh: admin@cuan.id (ADMIN), budi@cuan.id, rina@cuan.id");
  if (generated) {
    console.log(`Password (acak, hanya ditampilkan sekali): ${plain}`);
    console.log("Setel SEED_PASSWORD di .env untuk menentukan sendiri.");
  } else {
    console.log("Password diambil dari SEED_PASSWORD.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
