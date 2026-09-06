"use client";

import { useActionState, useEffect } from "react";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { STATE_AWAL } from "@/features/auth/form-state";
import { salinAnggaranBulanLaluAction } from "@/features/budgets/actions";

/** Menyalin seluruh anggaran bulan sebelumnya ke periode yang sedang dibuka. */
export function CopyBudgetButton({ periode }: { periode: string }) {
  const [state, formAction] = useActionState(
    salinAnggaranBulanLaluAction,
    STATE_AWAL,
  );

  useEffect(() => {
    if (!state.pesan) return;
    if (state.gagal) toast.error(state.pesan);
    else toast.success(state.pesan);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="period" value={periode} />
      <SubmitButton variant="outline" size="sm" teksMemuat="Menyalin...">
        <CopyPlus className="size-4" aria-hidden />
        Salin dari bulan lalu
      </SubmitButton>
    </form>
  );
}
