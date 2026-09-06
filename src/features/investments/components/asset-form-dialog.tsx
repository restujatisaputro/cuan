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
import { simpanAsetAction } from "@/features/investments/actions";
import {
  INVESTMENT_TYPE_LABEL,
  INVESTMENT_TYPES,
  type InvestmentType,
} from "@/lib/constants";

type Props = {
  aset?: {
    id: string;
    name: string;
    type: InvestmentType;
    ticker: string | null;
    lastPrice: string;
  };
  pemicu?: React.ReactNode;
};

export function AssetFormDialog({ aset, pemicu }: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanAsetAction, STATE_AWAL);
  const sedangUbah = Boolean(aset);

  useEffect(() => {
    if (state.pesan && !state.gagal) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {pemicu ?? (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Tambah aset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sedangUbah ? "Ubah aset" : "Tambah aset"}</DialogTitle>
          <DialogDescription>
            Aset menampung riwayat pembelian, penjualan, dan dividen. Harga
            terakhir dipakai untuk menghitung nilai pasar.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {aset ? <input type="hidden" name="id" value={aset.id} /> : null}
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="aset-nama">Nama aset</Label>
            <Input
              id="aset-nama"
              name="name"
              defaultValue={aset?.name}
              placeholder="mis. Bank Central Asia"
              required
              aria-invalid={Boolean(galatField(state, "name"))}
            />
            <FieldError pesan={galatField(state, "name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aset-jenis">Jenis</Label>
              <Select name="type" defaultValue={aset?.type ?? "STOCK"}>
                <SelectTrigger id="aset-jenis" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map((jenis) => (
                    <SelectItem key={jenis} value={jenis}>
                      {INVESTMENT_TYPE_LABEL[jenis]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aset-kode">Kode (opsional)</Label>
              <Input
                id="aset-kode"
                name="ticker"
                defaultValue={aset?.ticker ?? ""}
                placeholder="mis. BBCA"
              />
              <FieldError pesan={galatField(state, "ticker")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aset-harga">Harga terakhir per unit</Label>
            <Input
              id="aset-harga"
              name="lastPrice"
              inputMode="decimal"
              defaultValue={aset?.lastPrice ?? ""}
              placeholder="mis. 10250 atau 1287,4521"
              required
              aria-invalid={Boolean(galatField(state, "lastPrice"))}
            />
            <FieldError pesan={galatField(state, "lastPrice")} />
            <p className="text-muted-foreground text-xs">
              Boleh memakai koma untuk desimal, mis. NAB reksa dana 1287,4521.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton>{sedangUbah ? "Simpan" : "Tambah"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
