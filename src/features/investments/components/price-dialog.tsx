"use client";

import { useActionState, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { galatField, STATE_AWAL } from "@/features/auth/form-state";
import { perbaruiHargaAction } from "@/features/investments/actions";

/** Pembaruan cepat harga pasar sebuah aset. */
export function PriceDialog({
  assetId,
  nama,
  hargaSekarang,
  pemicu,
}: {
  assetId: string;
  nama: string;
  hargaSekarang: string;
  pemicu?: React.ReactNode;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(perbaruiHargaAction, STATE_AWAL);

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
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4" aria-hidden />
            Perbarui harga
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Perbarui harga {nama}</DialogTitle>
          <DialogDescription>
            Masukkan harga pasar terbaru per unit untuk menghitung ulang nilai
            portofolio.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={assetId} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="harga-baru">Harga per unit</Label>
            <Input
              id="harga-baru"
              name="lastPrice"
              inputMode="decimal"
              defaultValue={hargaSekarang}
              required
              aria-invalid={Boolean(galatField(state, "lastPrice"))}
            />
            <FieldError pesan={galatField(state, "lastPrice")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton>Simpan harga</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
