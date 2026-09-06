"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { galatField, STATE_AWAL } from "@/features/auth/form-state";
import { gantiPasswordAction } from "@/features/users/actions";

export function PasswordForm() {
  const [state, formAction] = useActionState(gantiPasswordAction, STATE_AWAL);
  const berhasil = Boolean(state.pesan) && !state.galatField;

  return (
    <form action={formAction} className="space-y-4" noValidate key={berhasil ? "reset" : "form"}>
      <FormAlert pesan={state.pesan} berhasil={berhasil} />

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Password saat ini</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(galatField(state, "currentPassword"))}
        />
        <FieldError pesan={galatField(state, "currentPassword")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Password baru</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            required
            aria-invalid={Boolean(galatField(state, "newPassword"))}
          />
          <FieldError pesan={galatField(state, "newPassword")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Ulangi password baru</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(galatField(state, "confirmPassword"))}
          />
          <FieldError pesan={galatField(state, "confirmPassword")} />
        </div>
      </div>

      <SubmitButton teksMemuat="Mengganti...">Ganti password</SubmitButton>
    </form>
  );
}
