"use client";

import { useActionState } from "react";
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
import { CURRENCIES, TIMEZONES } from "@/features/auth/schema";
import { perbaruiProfilAction } from "@/features/users/actions";

const LABEL_ZONA: Record<string, string> = {
  "Asia/Jakarta": "WIB — Asia/Jakarta",
  "Asia/Makassar": "WITA — Asia/Makassar",
  "Asia/Jayapura": "WIT — Asia/Jayapura",
  UTC: "UTC",
};

export function ProfileForm({
  nama,
  email,
  currency,
  timezone,
}: {
  nama: string;
  email: string;
  currency: string;
  timezone: string;
}) {
  const [state, formAction] = useActionState(perbaruiProfilAction, STATE_AWAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert pesan={state.pesan} berhasil={!state.galatField && Boolean(state.pesan)} />

      <div className="space-y-2">
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          name="name"
          defaultValue={nama}
          autoComplete="name"
          required
          aria-invalid={Boolean(galatField(state, "name"))}
        />
        <FieldError pesan={galatField(state, "name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email-tampilan">Email</Label>
        <Input id="email-tampilan" value={email} readOnly disabled />
        <p className="text-muted-foreground text-xs">
          Email dipakai untuk masuk dan tidak dapat diubah sendiri.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">Mata uang</Label>
          <Select name="currency" defaultValue={currency}>
            <SelectTrigger id="currency" className="w-full">
              <SelectValue placeholder="Pilih mata uang" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((kode) => (
                <SelectItem key={kode} value={kode}>
                  {kode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError pesan={galatField(state, "currency")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Zona waktu</Label>
          <Select name="timezone" defaultValue={timezone}>
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue placeholder="Pilih zona waktu" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((zona) => (
                <SelectItem key={zona} value={zona}>
                  {LABEL_ZONA[zona] ?? zona}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError pesan={galatField(state, "timezone")} />
        </div>
      </div>

      <SubmitButton>Simpan perubahan</SubmitButton>
    </form>
  );
}
