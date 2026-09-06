import Link from "next/link";
import { Wallet } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Wallet className="size-5" aria-hidden />
        </span>
        Cuan
      </Link>

      <div className="w-full max-w-sm">{children}</div>

      <p className="text-muted-foreground max-w-sm text-center text-xs">
        Catatan keuangan pribadi Anda tersimpan di server sendiri.
      </p>
    </main>
  );
}
