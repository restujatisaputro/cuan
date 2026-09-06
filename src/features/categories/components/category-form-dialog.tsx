"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { galatField, STATE_AWAL } from "@/features/auth/form-state";
import { simpanKategoriAction } from "@/features/categories/actions";
import { WARNA_KATEGORI } from "@/features/categories/schema";
import { CATEGORY_KIND_LABEL, type CategoryKind } from "@/lib/constants";
import { cn } from "@/lib/utils";

type IndukPilihan = { id: string; name: string; kind: CategoryKind };

type Props = {
  kategori?: {
    id: string;
    name: string;
    kind: CategoryKind;
    parentId: string | null;
    color: string | null;
  };
  /** Kategori tingkat atas yang boleh dijadikan induk. */
  induk: IndukPilihan[];
  /** Nilai awal saat menambah dari tab tertentu. */
  jenisAwal?: CategoryKind;
  indukAwal?: string;
  pemicu?: React.ReactNode;
};

export function CategoryFormDialog({
  kategori,
  induk,
  jenisAwal = "EXPENSE",
  indukAwal,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanKategoriAction, STATE_AWAL);
  const [jenis, setJenis] = useState<CategoryKind>(kategori?.kind ?? jenisAwal);
  const [warna, setWarna] = useState(kategori?.color ?? WARNA_KATEGORI[9]);
  const sedangUbah = Boolean(kategori);

  useEffect(() => {
    if (state.pesan && !state.gagal) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  // Induk hanya boleh dari jenis yang sama dan bukan dirinya sendiri.
  const indukTersedia = induk.filter(
    (item) => item.kind === jenis && item.id !== kategori?.id,
  );

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {pemicu ?? (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Tambah kategori
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sedangUbah ? "Ubah kategori" : "Tambah kategori"}
          </DialogTitle>
          <DialogDescription>
            Kategori memisahkan pemasukan dan pengeluaran agar laporan mudah
            dibaca. Sub-kategori dibatasi satu tingkat.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {kategori ? <input type="hidden" name="id" value={kategori.id} /> : null}
          <input type="hidden" name="color" value={warna} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="kategori-nama">Nama</Label>
            <Input
              id="kategori-nama"
              name="name"
              defaultValue={kategori?.name}
              placeholder="mis. Listrik"
              required
              aria-invalid={Boolean(galatField(state, "name"))}
            />
            <FieldError pesan={galatField(state, "name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kategori-jenis">Jenis</Label>
              <Select
                name="kind"
                value={jenis}
                onValueChange={(nilai) => setJenis(nilai as CategoryKind)}
              >
                <SelectTrigger id="kategori-jenis" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">
                    {CATEGORY_KIND_LABEL.INCOME}
                  </SelectItem>
                  <SelectItem value="EXPENSE">
                    {CATEGORY_KIND_LABEL.EXPENSE}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kategori-induk">Induk</Label>
              <Select
                name="parentId"
                defaultValue={kategori?.parentId ?? indukAwal ?? "none"}
              >
                <SelectTrigger id="kategori-induk" className="w-full">
                  <SelectValue placeholder="Tanpa induk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa induk</SelectItem>
                  {indukTersedia.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {WARNA_KATEGORI.map((pilihan) => (
                <button
                  key={pilihan}
                  type="button"
                  onClick={() => setWarna(pilihan)}
                  aria-label={`Pilih warna ${pilihan}`}
                  aria-pressed={warna === pilihan}
                  className={cn(
                    "size-7 rounded-full border-2 transition",
                    warna === pilihan
                      ? "border-foreground scale-110"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: pilihan }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTerbuka(false)}>
              Batal
            </Button>
            <SubmitButton>{sedangUbah ? "Simpan" : "Tambah"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
