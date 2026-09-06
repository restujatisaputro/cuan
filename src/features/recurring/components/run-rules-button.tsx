"use client";

import { useActionState, useEffect } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { STATE_AWAL } from "@/features/auth/form-state";
import { jalankanAturanAction } from "@/features/recurring/actions";

/** Menjalankan seluruh aturan yang sudah jatuh tempo secara manual. */
export function RunRulesButton({ jumlahTertunggak }: { jumlahTertunggak: number }) {
  const [state, formAction] = useActionState(jalankanAturanAction, STATE_AWAL);

  useEffect(() => {
    if (!state.pesan) return;
    if (state.gagal) toast.error(state.pesan);
    else toast.success(state.pesan);
  }, [state]);

  return (
    <form action={formAction}>
      <SubmitButton
        variant={jumlahTertunggak > 0 ? "default" : "outline"}
        size="sm"
        teksMemuat="Menjalankan..."
      >
        <Play className="size-4" aria-hidden />
        {jumlahTertunggak > 0
          ? `Jalankan ${jumlahTertunggak} aturan jatuh tempo`
          : "Jalankan sekarang"}
      </SubmitButton>
    </form>
  );
}
