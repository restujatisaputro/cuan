/**
 * Konstanta domain.
 *
 * Nilai-nilai ini disimpan sebagai String di database (SQLite tidak mendukung
 * enum di Prisma) dan divalidasi ulang memakai Zod di server. Saat pindah ke
 * PostgreSQL, daftar yang sama dapat dijadikan enum asli tanpa mengubah query.
 */

export const ROLES = ["ADMIN", "USER"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_TYPES = [
  "CASH",
  "BANK",
  "EWALLET",
  "RECEIVABLE",
  "CREDIT_CARD",
  "LOAN",
  "INVESTMENT",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: "Kas/Dompet",
  BANK: "Bank",
  EWALLET: "E-Wallet",
  RECEIVABLE: "Piutang",
  CREDIT_CARD: "Kartu Kredit",
  LOAN: "Pinjaman",
  INVESTMENT: "Portofolio Investasi",
};

/** Tipe akun yang menambah kewajiban (saldo negatif menaikkan utang). */
export const LIABILITY_ACCOUNT_TYPES: readonly AccountType[] = [
  "CREDIT_CARD",
  "LOAN",
];

/**
 * Akun penampung setoran ke portofolio investasi. Saldonya tidak ikut dihitung
 * pada saldo kas maupun kekayaan bersih; nilai investasi diambil dari harga
 * pasar aset (modul Investasi) supaya tidak terhitung dua kali.
 */
export const EXCLUDED_FROM_CASH_TYPES: readonly AccountType[] = ["INVESTMENT"];

/** Nama akun portofolio yang dibuat otomatis oleh modul investasi. */
export const INVESTMENT_ACCOUNT_NAME = "Portofolio Investasi";

export const CATEGORY_KINDS = ["INCOME", "EXPENSE"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_LABEL: Record<CategoryKind, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
};

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
};

export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

export const DEBT_DIRECTIONS = ["PAYABLE", "RECEIVABLE"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DEBT_DIRECTION_LABEL: Record<DebtDirection, string> = {
  PAYABLE: "Utang",
  RECEIVABLE: "Piutang",
};

export const INTEREST_TYPES = ["FLAT", "ANNUITY", "NONE"] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

export const INTEREST_TYPE_LABEL: Record<InterestType, string> = {
  FLAT: "Bunga flat",
  ANNUITY: "Anuitas",
  NONE: "Tanpa bunga",
};

export const DEBT_STATUSES = ["AKTIF", "LUNAS", "TERLAMBAT"] as const;
export type DebtStatus = (typeof DEBT_STATUSES)[number];

export const SAVINGS_STATUSES = ["AKTIF", "TERCAPAI", "BATAL"] as const;
export type SavingsStatus = (typeof SAVINGS_STATUSES)[number];

export const SAVINGS_STATUS_LABEL: Record<SavingsStatus, string> = {
  AKTIF: "Aktif",
  TERCAPAI: "Tercapai",
  BATAL: "Dibatalkan",
};

export const INVESTMENT_TYPES = [
  "STOCK",
  "MUTUAL_FUND",
  "BOND",
  "GOLD",
  "CRYPTO",
  "OTHER",
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  STOCK: "Saham",
  MUTUAL_FUND: "Reksa Dana",
  BOND: "Obligasi",
  GOLD: "Emas",
  CRYPTO: "Kripto",
  OTHER: "Lainnya",
};

export const INVESTMENT_ACTIONS = ["BUY", "SELL", "DIVIDEND"] as const;
export type InvestmentAction = (typeof INVESTMENT_ACTIONS)[number];

export const INVESTMENT_ACTION_LABEL: Record<InvestmentAction, string> = {
  BUY: "Beli",
  SELL: "Jual",
  DIVIDEND: "Dividen",
};

/**
 * Nominal disimpan sebagai Int (rupiah penuh), sehingga satu baris transaksi
 * dibatasi nilai maksimum integer 32-bit.
 */
export const MAX_AMOUNT = 2_147_483_647;

/** Kategori bawaan yang dibuat otomatis saat pengguna mendaftar. */
export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}> = [
  { name: "Gaji", kind: "INCOME", icon: "Wallet", color: "#16a34a" },
  { name: "Bonus", kind: "INCOME", icon: "Gift", color: "#22c55e" },
  { name: "Investasi", kind: "INCOME", icon: "TrendingUp", color: "#0ea5e9" },
  { name: "Makan & Minum", kind: "EXPENSE", icon: "Utensils", color: "#f97316" },
  { name: "Transportasi", kind: "EXPENSE", icon: "Car", color: "#6366f1" },
  { name: "Belanja", kind: "EXPENSE", icon: "ShoppingBag", color: "#ec4899" },
  { name: "Tagihan", kind: "EXPENSE", icon: "ReceiptText", color: "#ef4444" },
  { name: "Kesehatan", kind: "EXPENSE", icon: "HeartPulse", color: "#14b8a6" },
  { name: "Pendidikan", kind: "EXPENSE", icon: "GraduationCap", color: "#8b5cf6" },
  { name: "Hiburan", kind: "EXPENSE", icon: "Clapperboard", color: "#eab308" },
  { name: "Lain-lain", kind: "EXPENSE", icon: "Ellipsis", color: "#64748b" },
];

/** Akun bawaan yang dibuat otomatis saat pengguna mendaftar. */
export const DEFAULT_ACCOUNTS: ReadonlyArray<{
  name: string;
  type: AccountType;
}> = [
  { name: "Kas/Dompet", type: "CASH" },
  { name: "Bank", type: "BANK" },
];
