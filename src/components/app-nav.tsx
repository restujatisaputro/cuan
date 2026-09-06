"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/features/navigation/nav-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants";

function aktif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function untukPeran(role: Role) {
  return NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");
}

/** Navigasi samping untuk layar lebar. */
export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
      {untukPeran(role).map((item) => {
        const Icon = item.icon;
        const sedangAktif = aktif(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={sedangAktif ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              sedangAktif
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Navigasi bawah untuk ponsel: empat menu tersering ditambah tombol
 * "Lainnya" yang membuka seluruh daftar menu.
 */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [terbuka, setTerbuka] = useState(false);

  const semua = untukPeran(role);
  const utama = semua.filter((item) => item.utama);
  const lainnya = semua.filter((item) => !item.utama);
  const adaYangAktifDiLainnya = lainnya.some((item) => aktif(pathname, item.href));

  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      aria-label="Navigasi utama"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${utama.length + 1}, minmax(0, 1fr))` }}
      >
        {utama.map((item) => {
          const Icon = item.icon;
          const sedangAktif = aktif(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={sedangAktif ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium",
                  sedangAktif ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}

        <li>
          <Sheet open={terbuka} onOpenChange={setTerbuka}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium",
                  adaYangAktifDiLainnya ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Menu className="size-5" aria-hidden />
                Lainnya
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Menu lainnya</SheetTitle>
                <SheetDescription>Semua halaman aplikasi Cuan.</SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2 px-4 pb-8">
                {semua.map((item) => {
                  const Icon = item.icon;
                  const sedangAktif = aktif(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setTerbuka(false)}
                      aria-current={sedangAktif ? "page" : undefined}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium",
                        sedangAktif
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
