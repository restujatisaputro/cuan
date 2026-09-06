"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const pemisah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Menyisakan digit saja, lalu memformatnya dengan titik pemisah ribuan. */
function format(nilai: string): string {
  const digit = nilai.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digit === "") return "";
  return pemisah.format(BigInt(digit));
}

type Props = {
  name: string;
  id?: string;
  defaultValue?: string | number | bigint;
  placeholder?: string;
  required?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

/**
 * Isian nominal rupiah. Nilai yang dikirim berupa angka berpemisah titik
 * (mis. "1.250.000") dan diurai di server memakai toMoney().
 */
export function MoneyInput({
  name,
  id,
  defaultValue,
  placeholder = "0",
  required,
  className,
  ...sisa
}: Props) {
  const idOtomatis = useId();
  const [nilai, setNilai] = useState(() =>
    defaultValue == null ? "" : format(String(defaultValue)),
  );

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
        Rp
      </span>
      <Input
        id={id ?? idOtomatis}
        name={name}
        value={nilai}
        onChange={(event) => setNilai(format(event.target.value))}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        required={required}
        className={cn("pl-9 text-right tabular-nums", className)}
        {...sisa}
      />
    </div>
  );
}
