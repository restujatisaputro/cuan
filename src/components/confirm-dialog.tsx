"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { STATE_AWAL, type FormState } from "@/features/auth/form-state";

type Props = {
  /** Server Action yang dijalankan bila pengguna menyetujui. */
  aksi: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Field tersembunyi yang ikut dikirim, mis. { id }. */
  data: Record<string, string>;
  judul: string;
  keterangan: string;
  teksTombol?: string;
  pemicu: React.ReactNode;
};

/**
 * Dialog konfirmasi untuk aksi yang tidak bisa dibatalkan (hapus/arsip).
 * Hasilnya ditampilkan sebagai notifikasi.
 */
export function ConfirmDialog({
  aksi,
  data,
  judul,
  keterangan,
  teksTombol = "Hapus",
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction, pending] = useActionState(aksi, STATE_AWAL);

  useEffect(() => {
    if (!state.pesan) return;
    if (state.galatField || state.gagal) {
      toast.error(state.pesan);
    } else {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  return (
    <AlertDialog open={terbuka} onOpenChange={setTerbuka}>
      <AlertDialogTrigger asChild>{pemicu}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{judul}</AlertDialogTitle>
          <AlertDialogDescription>{keterangan}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <form action={formAction}>
            {Object.entries(data).map(([nama, nilai]) => (
              <input key={nama} type="hidden" name={nama} value={nilai} />
            ))}
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? "Memproses..." : teksTombol}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
