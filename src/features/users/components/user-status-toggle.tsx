"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { STATE_AWAL } from "@/features/auth/form-state";
import { adminUbahStatusAction } from "@/features/users/actions";

/**
 * Tombol aktif/nonaktif untuk satu pengguna. Menampilkan hasilnya sebagai
 * notifikasi supaya tabel tetap ringkas.
 */
export function UserStatusToggle({
  userId,
  isActive,
  nama,
  dirinyaSendiri,
}: {
  userId: string;
  isActive: boolean;
  nama: string;
  dirinyaSendiri: boolean;
}) {
  const [state, formAction] = useActionState(adminUbahStatusAction, STATE_AWAL);
  const terakhir = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!state.pesan || state.pesan === terakhir.current) return;
    terakhir.current = state.pesan;
    if (state.pesan.includes("tidak dapat") || state.pesan.includes("Minimal")) {
      toast.error(state.pesan);
    } else {
      toast.success(state.pesan);
    }
  }, [state]);

  if (dirinyaSendiri) {
    return (
      <span className="text-muted-foreground text-xs">Akun Anda sendiri</span>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <SubmitButton
        variant={isActive ? "outline" : "default"}
        size="sm"
        teksMemuat="Memproses..."
      >
        {isActive ? `Nonaktifkan` : `Aktifkan`}
        <span className="sr-only"> {nama}</span>
      </SubmitButton>
    </form>
  );
}
