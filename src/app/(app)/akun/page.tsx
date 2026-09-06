import type { Metadata } from "next";
import { Archive, ArchiveRestore, Pencil, Trash2, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/form-feedback";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AccountFormDialog } from "@/features/accounts/components/account-form-dialog";
import {
  hapusAkunAction,
  ubahArsipAkunAction,
} from "@/features/accounts/actions";
import { ambilAkunDenganSaldo } from "@/features/accounts/service";
import { wajibMasuk } from "@/lib/session";
import { ACCOUNT_TYPE_LABEL } from "@/lib/constants";
import { formatRupiah, sumMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Akun" };

export default async function HalamanAkun() {
  const pengguna = await wajibMasuk();
  const akun = await ambilAkunDenganSaldo(pengguna.id, { sertakanArsip: true });

  const aktif = akun.filter((item) => !item.isArchived);
  const diarsipkan = akun.filter((item) => item.isArchived);
  // Portofolio investasi dikecualikan: nilainya dihitung dari harga pasar aset.
  const totalKas = sumMoney(
    aktif.filter((item) => item.type !== "INVESTMENT").map((item) => item.saldo),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Akun</h1>
          <p className="text-muted-foreground text-sm">
            Tempat uang Anda berada beserta saldo terkininya.
          </p>
        </div>
        <AccountFormDialog />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total saldo kas</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatRupiah(totalKas)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Gabungan {aktif.length} akun aktif. Saldo portofolio investasi tidak
          ikut dihitung di sini.
        </CardContent>
      </Card>

      {aktif.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-8" aria-hidden />}
          judul="Belum ada akun aktif"
          keterangan="Tambahkan dompet atau rekening bank untuk mulai mencatat transaksi."
          aksi={<AccountFormDialog />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {aktif.map((item) => (
            <KartuAkun key={item.id} akun={item} />
          ))}
        </div>
      )}

      {diarsipkan.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-medium">
            Diarsipkan ({diarsipkan.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {diarsipkan.map((item) => (
              <KartuAkun key={item.id} akun={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function KartuAkun({
  akun,
}: {
  akun: Awaited<ReturnType<typeof ambilAkunDenganSaldo>>[number];
}) {
  const bisaDihapus = akun.jumlahTransaksi === 0;

  return (
    <Card className={cn(akun.isArchived && "opacity-70")}>
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{akun.name}</CardTitle>
            <CardDescription>{ACCOUNT_TYPE_LABEL[akun.type]}</CardDescription>
          </div>
          {akun.isArchived ? <Badge variant="secondary">Arsip</Badge> : null}
        </div>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            akun.saldo < 0n && "text-destructive",
          )}
        >
          {formatRupiah(akun.saldo)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <span className="text-muted-foreground text-xs">
          {akun.jumlahTransaksi} transaksi · saldo awal{" "}
          {formatRupiah(akun.openingBalance)}
        </span>

        <div className="flex items-center gap-1">
          {akun.type === "INVESTMENT" ? null : (
            <AccountFormDialog
              akun={{
                id: akun.id,
                name: akun.name,
                type: akun.type,
                openingBalance: akun.openingBalance.toString(),
              }}
              pemicu={
                <Button variant="ghost" size="icon" aria-label={`Ubah ${akun.name}`}>
                  <Pencil className="size-4" aria-hidden />
                </Button>
              }
            />
          )}

          <ConfirmDialog
            aksi={ubahArsipAkunAction}
            data={{ id: akun.id }}
            judul={akun.isArchived ? "Aktifkan akun?" : "Arsipkan akun?"}
            keterangan={
              akun.isArchived
                ? `${akun.name} akan muncul kembali pada pilihan akun di form transaksi.`
                : `${akun.name} disembunyikan dari pilihan akun, tetapi seluruh riwayat transaksinya tetap tersimpan.`
            }
            teksTombol={akun.isArchived ? "Aktifkan" : "Arsipkan"}
            pemicu={
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  akun.isArchived
                    ? `Aktifkan ${akun.name}`
                    : `Arsipkan ${akun.name}`
                }
              >
                {akun.isArchived ? (
                  <ArchiveRestore className="size-4" aria-hidden />
                ) : (
                  <Archive className="size-4" aria-hidden />
                )}
              </Button>
            }
          />

          {bisaDihapus ? (
            <ConfirmDialog
              aksi={hapusAkunAction}
              data={{ id: akun.id }}
              judul="Hapus akun?"
              keterangan={`${akun.name} belum punya transaksi, jadi aman dihapus permanen.`}
              pemicu={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${akun.name}`}
                  className="text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              }
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
