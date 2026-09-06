"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /** Teks yang tampil selama proses berjalan. */
  teksMemuat?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

/** Tombol kirim dengan status memuat otomatis dari form induknya. */
export function SubmitButton({
  children,
  teksMemuat = "Menyimpan...",
  className,
  variant,
  size,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={cn(className)}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {teksMemuat}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
