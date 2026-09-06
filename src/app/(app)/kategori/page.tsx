import type { Metadata } from "next";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/form-feedback";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CategoryFormDialog } from "@/features/categories/components/category-form-dialog";
import { hapusKategoriAction } from "@/features/categories/actions";
import {
  ambilKategoriTersusun,
  type KategoriDenganPemakaian,
} from "@/features/categories/service";
import { wajibMasuk } from "@/lib/session";
import type { CategoryKind } from "@/lib/constants";

export const metadata: Metadata = { title: "Kategori" };

export default async function HalamanKategori() {
  const pengguna = await wajibMasuk();
  const { pemasukan, pengeluaran } = await ambilKategoriTersusun(pengguna.id);

  const induk = [...pemasukan, ...pengeluaran].map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategori</h1>
          <p className="text-muted-foreground text-sm">
            Kelompokkan transaksi agar laporan dan anggaran mudah dibaca.
          </p>
        </div>
        <CategoryFormDialog induk={induk} />
      </div>

      <Tabs defaultValue="pengeluaran">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pengeluaran" className="flex-1 sm:flex-none">
            Pengeluaran ({pengeluaran.length})
          </TabsTrigger>
          <TabsTrigger value="pemasukan" className="flex-1 sm:flex-none">
            Pemasukan ({pemasukan.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pengeluaran" className="mt-4">
          <DaftarKategori daftar={pengeluaran} induk={induk} jenis="EXPENSE" />
        </TabsContent>
        <TabsContent value="pemasukan" className="mt-4">
          <DaftarKategori daftar={pemasukan} induk={induk} jenis="INCOME" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type IndukPilihan = { id: string; name: string; kind: CategoryKind };

function DaftarKategori({
  daftar,
  induk,
  jenis,
}: {
  daftar: KategoriDenganPemakaian[];
  induk: IndukPilihan[];
  jenis: CategoryKind;
}) {
  if (daftar.length === 0) {
    return (
      <EmptyState
        icon={<FolderTree className="size-8" aria-hidden />}
        judul="Belum ada kategori"
        keterangan="Tambahkan kategori pertama untuk kelompok transaksi ini."
        aksi={<CategoryFormDialog induk={induk} jenisAwal={jenis} />}
      />
    );
  }

  return (
    <div className="space-y-3">
      {daftar.map((kategori) => (
        <Card key={kategori.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: kategori.color ?? "#64748b" }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {kategori.name}
                  </CardTitle>
                  <CardDescription>
                    {kategori.jumlahTransaksi} transaksi
                    {kategori.anak.length > 0
                      ? ` · ${kategori.anak.length} sub-kategori`
                      : ""}
                  </CardDescription>
                </div>
              </div>
              <AksiKategori kategori={kategori} induk={induk} jenis={jenis} />
            </div>
          </CardHeader>

          {kategori.anak.length > 0 ? (
            <CardContent className="pt-0">
              <ul className="divide-y border-t">
                {kategori.anak.map((anak) => (
                  <li
                    key={anak.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: anak.color ?? "#64748b" }}
                        aria-hidden
                      />
                      <span className="truncate text-sm">{anak.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {anak.jumlahTransaksi} transaksi
                      </span>
                    </div>
                    <AksiKategori kategori={anak} induk={induk} jenis={jenis} />
                  </li>
                ))}
              </ul>
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function AksiKategori({
  kategori,
  induk,
  jenis,
}: {
  kategori: KategoriDenganPemakaian;
  induk: IndukPilihan[];
  jenis: CategoryKind;
}) {
  const adalahInduk = kategori.parentId === null;
  const bisaDihapus =
    kategori.jumlahTransaksi === 0 && kategori.anak.length === 0;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {adalahInduk ? (
        <CategoryFormDialog
          induk={induk}
          jenisAwal={jenis}
          indukAwal={kategori.id}
          pemicu={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Tambah sub-kategori ${kategori.name}`}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          }
        />
      ) : null}

      <CategoryFormDialog
        induk={induk}
        kategori={{
          id: kategori.id,
          name: kategori.name,
          kind: kategori.kind,
          parentId: kategori.parentId,
          color: kategori.color,
        }}
        pemicu={
          <Button variant="ghost" size="icon" aria-label={`Ubah ${kategori.name}`}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      />

      {bisaDihapus ? (
        <ConfirmDialog
          aksi={hapusKategoriAction}
          data={{ id: kategori.id }}
          judul="Hapus kategori?"
          keterangan={`${kategori.name} belum dipakai transaksi mana pun, jadi aman dihapus.`}
          pemicu={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Hapus ${kategori.name}`}
              className="text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
