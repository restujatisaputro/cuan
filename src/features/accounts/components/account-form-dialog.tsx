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
import { simpanAkunAction } from "@/features/accounts/actions";
import { TIPE_AKUN_PILIHAN } from "@/features/accounts/schema";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/lib/constants";

type Props = {
  akun?: {
    id: string;
    name: string;
    type: AccountType;
    openingBalance: string;
  };
  pemicu?: React.ReactNode;
};

export function AccountFormDialog({ akun, pemicu }: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanAkunAction, STATE_AWAL);
  const sedangUbah = Boolean(akun);

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
            Tambah akun
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sedangUbah ? "Ubah akun" : "Tambah akun"}</DialogTitle>
          <DialogDescription>
            Akun mewakili tempat uang Anda berada: dompet, rekening bank, atau
            e-wallet.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {akun ? <input type="hidden" name="id" value={akun.id} /> : null}
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="akun-nama">Nama akun</Label>
            <Input
              id="akun-nama"
              name="name"
              defaultValue={akun?.name}
              placeholder="mis. Bank BCA"
              required
              aria-invalid={Boolean(galatField(state, "name"))}
            />
            <FieldError pesan={galatField(state, "name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="akun-tipe">Tipe</Label>
            <Select name="type" defaultValue={akun?.type ?? "CASH"}>
              <SelectTrigger id="akun-tipe" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPE_AKUN_PILIHAN.map((tipe) => (
                  <SelectItem key={tipe} value={tipe}>
                    {ACCOUNT_TYPE_LABEL[tipe]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError pesan={galatField(state, "type")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="akun-saldo">Saldo awal</Label>
            <MoneyInput
              id="akun-saldo"
              name="openingBalance"
              defaultValue={akun?.openingBalance ?? "0"}
              aria-invalid={Boolean(galatField(state, "openingBalance"))}
            />
            <FieldError pesan={galatField(state, "openingBalance")} />
            <p className="text-muted-foreground text-xs">
              Saldo saat mulai mencatat. Transaksi berikutnya akan menambah atau
              menguranginya.
            </p>
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
