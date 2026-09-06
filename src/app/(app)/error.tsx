"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Batas error untuk halaman di dalam aplikasi. Kerangka (navigasi dan header)
 * tetap tampil sehingga pengguna bisa pindah halaman tanpa memuat ulang.
 */
export default function ErrorAplikasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Galat halaman:", error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <AlertTriangle className="text-destructive size-10" aria-hidden />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Halaman gagal dimuat</h1>
          <p className="text-muted-foreground max-w-md text-sm">
            Terjadi kesalahan saat menyiapkan data. Coba muat ulang; bila terus
            berulang, periksa log server.
          </p>
          {error.digest ? (
            <p className="text-muted-foreground font-mono text-xs">
              Kode: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Coba lagi</Button>
          <Button asChild variant="outline">
            <Link href="/dasbor">Kembali ke dasbor</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
