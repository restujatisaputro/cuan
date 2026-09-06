"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  /** Periode aktif, "YYYY-MM". */
  periode: string;
  /** Daftar periode yang boleh dipilih beserta labelnya. */
  pilihan: ReadonlyArray<{ nilai: string; label: string }>;
  /** Periode paling baru yang boleh dituju. */
  periodeMaksimal: string;
};

/** Pemilih periode bulanan yang menulis pilihannya ke query string. */
export function PeriodPicker({ periode, pilihan, periodeMaksimal }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const indeks = pilihan.findIndex((item) => item.nilai === periode);
  const sebelumnya = pilihan[indeks + 1]?.nilai;
  const berikutnya = indeks > 0 ? pilihan[indeks - 1]?.nilai : undefined;

  function pindah(tujuan?: string): void {
    if (!tujuan) return;
    const query = new URLSearchParams(searchParams.toString());
    query.set("periode", tujuan);
    router.push(`${pathname}?${query.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => pindah(sebelumnya)}
        disabled={!sebelumnya}
        aria-label="Bulan sebelumnya"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>

      <Select value={periode} onValueChange={(nilai) => pindah(nilai)}>
        <SelectTrigger className="w-40" aria-label="Pilih periode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pilihan.map((item) => (
            <SelectItem key={item.nilai} value={item.nilai}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => pindah(berikutnya)}
        disabled={!berikutnya || periode >= periodeMaksimal}
        aria-label="Bulan berikutnya"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
