"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { galatField, STATE_AWAL } from "@/features/auth/form-state";
import { simpanUtangAction } from "@/features/debts/actions";
import {
  INTEREST_TYPE_LABEL,
  INTEREST_TYPES,
  type DebtDirection,
  type InterestType,
} from "@/lib/constants";

type Props = {
  /** Arah awal saat menambah dari tab tertentu. */
  arahAwal?: DebtDirection;
  tanggalHariIni: string;
  utang?: {
    id: string;
    direction: DebtDirection;
    counterparty: string;
    principal: string;
    bungaPersen: string;
    interestType: InterestType;
    startDate: string;
    tenorMonths: number;
    note: string | null;
  };
  pemicu?: React.ReactNode;
};

const KELAS_PILIHAN_AKTIF = {
  PAYABLE:
    "border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm font-medium",
  RECEIVABLE:
    "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400",
} as const;

const KELAS_PILIHAN_PASIF =
  "text-muted-foreground hover:bg-muted rounded-lg border border-transparent px-3 py-2 text-sm font-medium";

export function DebtFormDialog({
  arahAwal = "PAYABLE",
  tanggalHariIni,
  utang,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanUtangAction, STATE_AWAL);
  const [arah, setArah] = useState<DebtDirection>(utang?.direction ?? arahAwal);
  const [jenisBunga, setJenisBunga] = useState<InterestType>(
    utang?.interestType ?? "NONE",
  );
  const sedangUbah = Boolean(utang);

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
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Tambah catatan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {sedangUbah ? "Ubah catatan" : "Tambah utang atau piutang"}
          </DialogTitle>
          <DialogDescription>
            Jadwal angsuran dan tanggal jatuh tempo dihitung otomatis dari pokok,
            bunga, dan tenor.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {utang ? <input type="hidden" name="id" value={utang.id} /> : null}
          <input type="hidden" name="direction" value={arah} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label="Jenis catatan"
          >
            <button
              type="button"
              onClick={() => setArah("PAYABLE")}
              aria-pressed={arah === "PAYABLE"}
              className={
                arah === "PAYABLE"
                  ? KELAS_PILIHAN_AKTIF.PAYABLE
                  : KELAS_PILIHAN_PASIF
              }
            >
              Saya berutang
            </button>
            <button
              type="button"
              onClick={() => setArah("RECEIVABLE")}
              aria-pressed={arah === "RECEIVABLE"}
              className={
                arah === "RECEIVABLE"
                  ? KELAS_PILIHAN_AKTIF.RECEIVABLE
                  : KELAS_PILIHAN_PASIF
              }
            >
              Saya memberi pinjaman
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utang-pihak">
              {arah === "PAYABLE" ? "Pemberi pinjaman" : "Peminjam"}
            </Label>
            <Input
              id="utang-pihak"
              name="counterparty"
              defaultValue={utang?.counterparty}
              placeholder="mis. Koperasi Sejahtera"
              required
              aria-invalid={Boolean(galatField(state, "counterparty"))}
            />
            <FieldError pesan={galatField(state, "counterparty")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="utang-pokok">Pokok</Label>
              <MoneyInput
                id="utang-pokok"
                name="principal"
                defaultValue={utang?.principal}
                required
                aria-invalid={Boolean(galatField(state, "principal"))}
              />
              <FieldError pesan={galatField(state, "principal")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utang-mulai">Tanggal mulai</Label>
              <Input
                id="utang-mulai"
                name="startDate"
                type="date"
                defaultValue={utang?.startDate ?? tanggalHariIni}
                required
                aria-invalid={Boolean(galatField(state, "startDate"))}
              />
              <FieldError pesan={galatField(state, "startDate")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="utang-jenis-bunga">Jenis bunga</Label>
              <Select
                name="interestType"
                value={jenisBunga}
                onValueChange={(nilai) => setJenisBunga(nilai as InterestType)}
              >
                <SelectTrigger id="utang-jenis-bunga" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEREST_TYPES.map((jenis) => (
                    <SelectItem key={jenis} value={jenis}>
                      {INTEREST_TYPE_LABEL[jenis]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utang-bunga">Bunga (% per tahun)</Label>
              <Input
                id="utang-bunga"
                name="interestRateBps"
                inputMode="decimal"
                defaultValue={utang?.bungaPersen ?? ""}
                placeholder={jenisBunga === "NONE" ? "0" : "mis. 12"}
                disabled={jenisBunga === "NONE"}
                aria-invalid={Boolean(galatField(state, "interestRateBps"))}
              />
              <FieldError pesan={galatField(state, "interestRateBps")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utang-tenor">Tenor (bulan)</Label>
              <Input
                id="utang-tenor"
                name="tenorMonths"
                type="number"
                min={1}
                max={600}
                defaultValue={utang?.tenorMonths ?? 12}
                required
                aria-invalid={Boolean(galatField(state, "tenorMonths"))}
              />
              <FieldError pesan={galatField(state, "tenorMonths")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utang-catatan">Catatan</Label>
            <Input
              id="utang-catatan"
              name="note"
              defaultValue={utang?.note ?? ""}
              placeholder="mis. Renovasi rumah"
            />
            <FieldError pesan={galatField(state, "note")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton>{sedangUbah ? "Simpan" : "Tambah"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
