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
import { simpanTargetAction } from "@/features/savings/actions";

type Props = {
  akun: ReadonlyArray<{ id: string; name: string }>;
  target?: {
    id: string;
    name: string;
    targetAmount: string;
    targetDate: string;
    accountId: string;
  };
  pemicu?: React.ReactNode;
};

export function GoalFormDialog({ akun, target, pemicu }: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanTargetAction, STATE_AWAL);
  const sedangUbah = Boolean(target);

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
            Tambah target
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sedangUbah ? "Ubah target" : "Tambah target"}</DialogTitle>
          <DialogDescription>
            Setiap setoran dicatat sebagai transfer dari akun sumber ke akun
            penampung, jadi saldo Anda tetap cocok.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {target ? <input type="hidden" name="id" value={target.id} /> : null}
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="target-nama">Nama target</Label>
            <Input
              id="target-nama"
              name="name"
              defaultValue={target?.name}
              placeholder="mis. Dana Darurat"
              required
              aria-invalid={Boolean(galatField(state, "name"))}
            />
            <FieldError pesan={galatField(state, "name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target-nominal">Target dana</Label>
              <MoneyInput
                id="target-nominal"
                name="targetAmount"
                defaultValue={target?.targetAmount}
                required
                aria-invalid={Boolean(galatField(state, "targetAmount"))}
              />
              <FieldError pesan={galatField(state, "targetAmount")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-tanggal">Tenggat (opsional)</Label>
              <Input
                id="target-tanggal"
                name="targetDate"
                type="date"
                defaultValue={target?.targetDate ?? ""}
                aria-invalid={Boolean(galatField(state, "targetDate"))}
              />
              <FieldError pesan={galatField(state, "targetDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-akun">Akun penampung</Label>
            <Select name="accountId" defaultValue={target?.accountId}>
              <SelectTrigger id="target-akun" className="w-full">
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
            <p className="text-muted-foreground text-xs">
              Sebaiknya akun khusus tabungan agar dananya tidak tercampur.
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
