import { Skeleton } from "@/components/ui/skeleton";

/** Status memuat bawaan untuk seluruh halaman di dalam aplikasi. */
export default function Memuat() {
  return (
    <div className="space-y-6" aria-busy aria-label="Memuat halaman">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
