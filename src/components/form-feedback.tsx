import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Menampilkan pesan galat di bawah sebuah field. */
export function FieldError({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <p className="text-destructive text-sm" role="alert">
      {pesan}
    </p>
  );
}

/** Menampilkan pesan hasil aksi: merah untuk galat, hijau untuk berhasil. */
export function FormAlert({
  pesan,
  berhasil = false,
}: {
  pesan?: string;
  berhasil?: boolean;
}) {
  if (!pesan) return null;

  return (
    <Alert
      variant={berhasil ? "default" : "destructive"}
      className={berhasil ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : undefined}
      role="status"
    >
      {berhasil ? (
        <CheckCircle2 className="size-4" aria-hidden />
      ) : (
        <AlertCircle className="size-4" aria-hidden />
      )}
      <AlertDescription>{pesan}</AlertDescription>
    </Alert>
  );
}

/** Tampilan kosong yang seragam untuk daftar yang belum berisi data. */
export function EmptyState({
  judul,
  keterangan,
  aksi,
  icon,
}: {
  judul: string;
  keterangan: string;
  aksi?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="space-y-1">
        <p className="font-medium">{judul}</p>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {keterangan}
        </p>
      </div>
      {aksi}
    </div>
  );
}
