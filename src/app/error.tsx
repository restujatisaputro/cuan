"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="text-destructive size-10" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Halaman gagal dimuat. Coba lagi; bila masih bermasalah, periksa log
          server.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">
            Kode: {error.digest}
          </p>
        ) : null}
      </div>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
