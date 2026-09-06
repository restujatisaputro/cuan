"use client";

import { useActionState, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { adminBuatPenggunaAction } from "@/features/users/actions";

export function CreateUserDialog() {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(adminBuatPenggunaAction, STATE_AWAL);

  useEffect(() => {
    if (state.pesan && !state.galatField) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" aria-hidden />
          Tambah pengguna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah pengguna</DialogTitle>
          <DialogDescription>
            Pengguna baru langsung mendapat akun kas dan kategori bawaan.
            Datanya terpisah penuh dari pengguna lain.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {state.galatField ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="admin-name">Nama</Label>
            <Input id="admin-name" name="name" required />
            <FieldError pesan={galatField(state, "name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" name="email" type="email" required />
            <FieldError pesan={galatField(state, "email")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password sementara</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              placeholder="Minimal 8 karakter"
              required
            />
            <FieldError pesan={galatField(state, "password")} />
            <p className="text-muted-foreground text-xs">
              Sampaikan password ini kepada penggunanya dan minta ia
              menggantinya lewat halaman Profil.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-role">Peran</Label>
            <Select name="role" defaultValue="USER">
              <SelectTrigger id="admin-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Pengguna</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
            <FieldError pesan={galatField(state, "role")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton teksMemuat="Membuat...">Buat pengguna</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
