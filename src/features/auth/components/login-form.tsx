"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { masukAction } from "@/features/auth/actions";
import { galatField, nilaiField, STATE_AWAL } from "@/features/auth/form-state";

export function LoginForm({ lanjut }: { lanjut?: string }) {
  const [state, formAction] = useActionState(masukAction, STATE_AWAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {lanjut ? <input type="hidden" name="lanjut" value={lanjut} /> : null}

      <FormAlert pesan={state.pesan} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          defaultValue={nilaiField(state, "email")}
          required
          aria-invalid={Boolean(galatField(state, "email"))}
        />
        <FieldError pesan={galatField(state, "email")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          aria-invalid={Boolean(galatField(state, "password"))}
        />
        <FieldError pesan={galatField(state, "password")} />
      </div>

      <SubmitButton className="w-full" teksMemuat="Memeriksa...">
        Masuk
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Belum punya akun?{" "}
        <Link href="/daftar" className="text-foreground font-medium underline underline-offset-4">
          Daftar
        </Link>
      </p>
    </form>
  );
}
