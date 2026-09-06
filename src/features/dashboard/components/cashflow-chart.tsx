"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah, formatRupiahRingkas } from "@/lib/money";
import type { TitikArusKas } from "@/features/dashboard/service";

const konfigurasi = {
  pemasukan: { label: "Pemasukan", color: "var(--color-emerald-500)" },
  pengeluaran: { label: "Pengeluaran", color: "var(--color-red-500)" },
} satisfies ChartConfig;

/** Grafik batang pemasukan vs pengeluaran beberapa bulan terakhir. */
export function CashflowChart({ data }: { data: TitikArusKas[] }) {
  return (
    <ChartContainer config={konfigurasi} className="h-56 w-full sm:h-72">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          fontSize={11}
          tickFormatter={(nilai: number) => formatRupiahRingkas(nilai)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(nilai, nama) => (
                <div className="flex w-full justify-between gap-3">
                  <span className="text-muted-foreground">
                    {konfigurasi[nama as keyof typeof konfigurasi]?.label ?? nama}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatRupiah(Number(nilai))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="pemasukan" fill="var(--color-pemasukan)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pengeluaran" fill="var(--color-pengeluaran)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
