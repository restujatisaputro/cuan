import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/form-feedback";
import { GoalFormDialog } from "@/features/savings/components/goal-form-dialog";
import { ContributionDialog } from "@/features/savings/components/contribution-dialog";
import {
  ambilDaftarTarget,
  type RingkasanTarget,
} from "@/features/savings/service";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah, sumMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tabungan" };

function formatTanggal(tanggal: Date | null): string {
  if (!tanggal) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanTabungan() {
  const pengguna = await wajibMasuk();
  const [daftar, akun] = await Promise.all([
    ambilDaftarTarget(pengguna.id),
    ambilAkunUntukPilihan(pengguna.id),
  ]);

  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: pengguna.timezone,
    dateStyle: "short",
  }).format(new Date());

  const aktif = daftar.filter((item) => item.status !== "BATAL");
  const totalTerkumpul = sumMoney(aktif.map((item) => item.terkumpul));
  const totalTarget = sumMoney(aktif.map((item) => item.targetAmount));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tabungan</h1>
          <p className="text-muted-foreground text-sm">
            Target dana beserta progres dan perkiraan waktu tercapainya.
          </p>
        </div>
        <GoalFormDialog akun={akun} />
      </div>

      {daftar.length === 0 ? (
        <EmptyState
          icon={<Target className="size-8" aria-hidden />}
          judul="Belum ada target tabungan"
          keterangan="Tetapkan target seperti dana darurat atau liburan, lalu catat setoran rutin Anda."
          aksi={<GoalFormDialog akun={akun} />}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total terkumpul</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatRupiah(totalTerkumpul)}
                <span className="text-muted-foreground text-base font-normal">
                  {" "}
                  / {formatRupiah(totalTarget)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Dari {aktif.length} target yang sedang berjalan.
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {daftar.map((item) => (
              <KartuTarget
                key={item.id}
                item={item}
                hariIni={hariIni}
                akun={akun}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KartuTarget({
  item,
  hariIni,
  akun,
}: {
  item: RingkasanTarget;
  hariIni: string;
  akun: ReadonlyArray<{ id: string; name: string }>;
}) {
  const akunSumber = akun.filter((pilihan) => pilihan.id !== item.accountId);

  return (
    <Card>
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{item.name}</CardTitle>
            <CardDescription>
              {item.akun ?? "Tanpa akun"}
              {item.targetDate ? ` · tenggat ${formatTanggal(item.targetDate)}` : ""}
            </CardDescription>
          </div>
          <Badge
            variant={
              item.status === "TERCAPAI"
                ? "default"
                : item.status === "BATAL"
                  ? "secondary"
                  : item.berisikoTerlambat
                    ? "destructive"
                    : "outline"
            }
          >
            {item.status === "TERCAPAI"
              ? "Tercapai"
              : item.status === "BATAL"
                ? "Batal"
                : item.berisikoTerlambat
                  ? "Perlu dikejar"
                  : "Aktif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <p className="text-xl font-semibold tabular-nums">
            {formatRupiah(item.terkumpul)}
          </p>
          <p className="text-muted-foreground text-right text-xs">
            dari {formatRupiah(item.targetAmount)}
          </p>
        </div>

        <Progress
          value={Math.min(item.persen, 100)}
          className={cn("h-2", item.status === "TERCAPAI" && "[&>div]:bg-emerald-500")}
        />

        <p className="text-muted-foreground text-xs">
          {item.sisa === 0n
            ? "Target tercapai."
            : `Kurang ${formatRupiah(item.sisa)} · ${item.persen.toFixed(0)}% terkumpul`}
        </p>

        {item.sisa > 0n && item.butuhPerBulan ? (
          <p className="text-muted-foreground text-xs">
            Perlu {formatRupiah(item.butuhPerBulan)} per bulan untuk tepat waktu
            {item.rataPerBulan > 0n
              ? ` · rata-rata setoran ${formatRupiah(item.rataPerBulan)}`
              : ""}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {item.status !== "BATAL" && item.sisa > 0n && akunSumber.length > 0 ? (
            <ContributionDialog
              goalId={item.id}
              namaTarget={item.name}
              akunPenampung={item.akun}
              tanggalHariIni={hariIni}
              saranNominal={item.butuhPerBulan?.toString()}
              akun={akunSumber}
            />
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`/tabungan/${item.id}`}>
              Detail
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
