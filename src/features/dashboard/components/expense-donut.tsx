"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah } from "@/lib/money";
import type { IrisanKategori } from "@/features/dashboard/service";

/**
 * Komposisi pengeluaran berbentuk donat beserta rinciannya.
 * Warna diambil dari warna kategori supaya konsisten dengan halaman lain.
 */
export function ExpenseDonut({ irisan }: { irisan: IrisanKategori[] }) {
  const konfigurasi = Object.fromEntries(
    irisan.map((item) => [item.id, { label: item.nama, color: item.warna }]),
  ) satisfies ChartConfig;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center">
      <ChartContainer config={konfigurasi} className="mx-auto h-44 w-44">
        <PieChart>
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload as IrisanKategori;
              return (
                <div className="bg-background rounded-lg border px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{data.nama}</p>
                  <p className="tabular-nums">
                    {formatRupiah(data.jumlah)} · {data.persen.toFixed(1)}%
                  </p>
                </div>
              );
            }}
          />
          <Pie
            data={irisan}
            dataKey="jumlah"
            nameKey="nama"
            innerRadius={45}
            outerRadius={78}
            paddingAngle={2}
            strokeWidth={2}
          >
            {irisan.map((item) => (
              <Cell key={item.id} fill={item.warna} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="space-y-2">
        {irisan.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.warna }}
                aria-hidden
              />
              <span className="truncate">{item.nama}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="font-medium tabular-nums">
                {formatRupiah(item.jumlah)}
              </span>
              <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                {item.persen.toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
