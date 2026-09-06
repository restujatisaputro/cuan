"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { daftarAction } from "@/features/auth/actions";
import { galatField, nilaiField, STATE_AWAL } from "@/features/auth/form-state";

export function RegisterForm() {
  const [state, formAction] = useActionState(daftarAction, STATE_AWAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert pesan={state.pesan} />

      <div className="space-y-2">
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Nama lengkap"
          defaultValue={nilaiField(state, "name")}
          required
          aria-invalid={Boolean(galatField(state, "name"))}
        />
        <FieldError pesan={galatField(state, "name")} />
      </div>

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
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          required
          aria-invalid={Boolean(galatField(state, "password"))}
        />
        <FieldError pesan={galatField(state, "password")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Ulangi password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          required
          aria-invalid={Boolean(galatField(state, "confirmPassword"))}
        />
        <FieldError pesan={galatField(state, "confirmPassword")} />
      </div>

      <SubmitButton className="w-full" teksMemuat="Membuat akun...">
        Daftar
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="text-foreground font-medium underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </form>
  );
}
