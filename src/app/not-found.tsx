import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TidakDitemukan() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="text-muted-foreground size-10" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-muted-foreground text-sm">
          Alamat yang Anda buka tidak tersedia.
        </p>
      </div>
      <Button asChild>
        <Link href="/dasbor">Kembali ke dasbor</Link>
      </Button>
    </main>
  );
}
