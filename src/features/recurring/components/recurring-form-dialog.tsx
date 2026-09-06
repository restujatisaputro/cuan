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
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { galatField, STATE_AWAL } from "@/features/auth/form-state";
import { simpanAturanAction } from "@/features/recurring/actions";
import {
  FREQUENCIES,
  FREQUENCY_LABEL,
  TRANSACTION_TYPE_LABEL,
  TRANSACTION_TYPES,
  type Frequency,
  type TransactionType,
} from "@/lib/constants";

export type AturanAwal = {
  id: string;
  name: string;
  type: TransactionType;
  amount: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  frequency: Frequency;
  interval: number;
  nextRunDate: string;
  endDate: string;
  note: string | null;
  tags: string | null;
};

type Props = {
  akun: ReadonlyArray<{ id: string; name: string }>;
  kategori: ReadonlyArray<{ id: string; label: string; kind: "INCOME" | "EXPENSE" }>;
  tanggalHariIni: string;
  aturan?: AturanAwal;
  pemicu?: React.ReactNode;
};

export function RecurringFormDialog({
  akun,
  kategori,
  tanggalHariIni,
  aturan,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanAturanAction, STATE_AWAL);
  const [tipe, setTipe] = useState<TransactionType>(aturan?.type ?? "EXPENSE");
  const sedangUbah = Boolean(aturan);

  useEffect(() => {
    if (state.pesan && !state.gagal) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  const kategoriTersedia = kategori.filter(
    (item) => item.kind === (tipe === "INCOME" ? "INCOME" : "EXPENSE"),
  );

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {pemicu ?? (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Tambah aturan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sedangUbah ? "Ubah aturan" : "Tambah aturan"}</DialogTitle>
          <DialogDescription>
            Transaksi dibuat otomatis setiap jadwalnya tiba. Aturan yang
            tertunggak akan dikejar sekaligus saat dijalankan.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {aturan ? <input type="hidden" name="id" value={aturan.id} /> : null}
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="ulang-nama">Nama aturan</Label>
            <Input
              id="ulang-nama"
              name="name"
              defaultValue={aturan?.name}
              placeholder="mis. Langganan internet"
              required
              aria-invalid={Boolean(galatField(state, "name"))}
            />
            <FieldError pesan={galatField(state, "name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ulang-tipe">Tipe</Label>
              <Select
                name="type"
                value={tipe}
                onValueChange={(nilai) => setTipe(nilai as TransactionType)}
              >
                <SelectTrigger id="ulang-tipe" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((nilai) => (
                    <SelectItem key={nilai} value={nilai}>
                      {TRANSACTION_TYPE_LABEL[nilai]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ulang-nominal">Nominal</Label>
              <MoneyInput
                id="ulang-nominal"
                name="amount"
                defaultValue={aturan?.amount}
                required
                aria-invalid={Boolean(galatField(state, "amount"))}
              />
              <FieldError pesan={galatField(state, "amount")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ulang-akun">
              {tipe === "TRANSFER" ? "Dari akun" : "Akun"}
            </Label>
            <Select name="accountId" defaultValue={aturan?.accountId ?? akun[0]?.id}>
              <SelectTrigger id="ulang-akun" className="w-full">
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent>
                {akun.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError pesan={galatField(state, "accountId")} />
          </div>

          {tipe === "TRANSFER" ? (
            <div className="space-y-2">
              <Label htmlFor="ulang-tujuan">Ke akun</Label>
              <Select name="toAccountId" defaultValue={aturan?.toAccountId ?? "none"}>
                <SelectTrigger id="ulang-tujuan" className="w-full">
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih akun tujuan</SelectItem>
                  {akun.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError pesan={galatField(state, "toAccountId")} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ulang-kategori">Kategori</Label>
              <Select
                name="categoryId"
                key={tipe}
                defaultValue={aturan?.categoryId ?? "none"}
              >
                <SelectTrigger id="ulang-kategori" className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih kategori</SelectItem>
                  {kategoriTersedia.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError pesan={galatField(state, "categoryId")} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ulang-frekuensi">Frekuensi</Label>
              <Select name="frequency" defaultValue={aturan?.frequency ?? "MONTHLY"}>
                <SelectTrigger id="ulang-frekuensi" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((nilai) => (
                    <SelectItem key={nilai} value={nilai}>
                      {FREQUENCY_LABEL[nilai]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ulang-interval">Setiap berapa periode</Label>
              <Input
                id="ulang-interval"
                name="interval"
                type="number"
                min={1}
                max={365}
                defaultValue={aturan?.interval ?? 1}
                required
                aria-invalid={Boolean(galatField(state, "interval"))}
              />
              <FieldError pesan={galatField(state, "interval")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ulang-mulai">Jadwal berikutnya</Label>
              <Input
                id="ulang-mulai"
                name="nextRunDate"
                type="date"
                defaultValue={aturan?.nextRunDate ?? tanggalHariIni}
                required
                aria-invalid={Boolean(galatField(state, "nextRunDate"))}
              />
              <FieldError pesan={galatField(state, "nextRunDate")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ulang-akhir">Berakhir (opsional)</Label>
              <Input
                id="ulang-akhir"
                name="endDate"
                type="date"
                defaultValue={aturan?.endDate ?? ""}
                aria-invalid={Boolean(galatField(state, "endDate"))}
              />
              <FieldError pesan={galatField(state, "endDate")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ulang-catatan">Catatan</Label>
              <Input
                id="ulang-catatan"
                name="note"
                defaultValue={aturan?.note ?? ""}
                placeholder="dipakai sebagai catatan transaksi"
              />
              <FieldError pesan={galatField(state, "note")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ulang-tag">Tag</Label>
              <Input
                id="ulang-tag"
                name="tags"
                defaultValue={aturan?.tags ?? ""}
                placeholder="mis. rutin"
              />
              <FieldError pesan={galatField(state, "tags")} />
            </div>
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
