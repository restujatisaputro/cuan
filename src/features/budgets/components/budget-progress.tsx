import { Progress } from "@/components/ui/progress";
import { formatRupiah } from "@/lib/money";
import type { ProgresAnggaran } from "@/features/budgets/service";
import { cn } from "@/lib/utils";

/** Satu baris progres anggaran beserta sisa atau kelebihannya. */
export function BudgetProgressRow({
  item,
  aksi,
}: {
  item: ProgresAnggaran;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.warna }}
            aria-hidden
          />
          <span className="truncate text-sm font-medium">{item.kategori}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-sm tabular-nums">
            {formatRupiah(item.terpakai)}
            <span className="text-muted-foreground"> / {formatRupiah(item.anggaran)}</span>
          </span>
          {aksi}
        </span>
      </div>

      <Progress
        value={Math.min(item.persen, 100)}
        className={cn("h-2", item.terlampaui && "[&>div]:bg-destructive")}
        aria-label={`Pemakaian anggaran ${item.kategori}`}
      />

      <p
        className={cn(
          "text-xs",
          item.terlampaui ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {item.terlampaui
          ? `Lewat ${formatRupiah(-item.sisa)} dari anggaran`
          : `Sisa ${formatRupiah(item.sisa)} · ${item.persen.toFixed(0)}% terpakai`}
      </p>
    </div>
  );
}
