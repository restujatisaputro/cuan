import Link from "next/link";
import { Wallet } from "lucide-react";
import { BottomNav, SidebarNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { wajibMasuk } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Pertahanan berlapis: middleware sudah menyaring, halaman tetap memeriksa.
  const pengguna = await wajibMasuk();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="bg-muted/30 hidden border-r md:flex md:min-h-dvh md:flex-col md:gap-6 md:p-4">
        <Link href="/dasbor" className="flex items-center gap-2 px-2 py-1 text-lg font-semibold">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Wallet className="size-4" aria-hidden />
          </span>
          Cuan
        </Link>
        <SidebarNav role={pengguna.role} />
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur">
          <Link href="/dasbor" className="flex items-center gap-2 font-semibold md:hidden">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <Wallet className="size-4" aria-hidden />
            </span>
            Cuan
          </Link>
          <div className="hidden md:block" />
          <UserMenu
            nama={pengguna.name}
            email={pengguna.email}
            peran={pengguna.role}
          />
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <BottomNav role={pengguna.role} />
    </div>
  );
}
