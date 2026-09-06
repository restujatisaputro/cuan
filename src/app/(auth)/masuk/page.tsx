import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormAlert } from "@/components/form-feedback";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Masuk" };

const PESAN_ALASAN: Record<string, string> = {
  "sesi-berakhir": "Sesi Anda berakhir. Silakan masuk kembali.",
  "akun-nonaktif": "Akun ini dinonaktifkan. Hubungi administrator.",
};

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; alasan?: string }>;
}) {
  const { lanjut, alasan } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Masuk</CardTitle>
        <CardDescription>
          Gunakan email dan password akun Cuan Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alasan ? (
          <FormAlert pesan={PESAN_ALASAN[alasan] ?? "Silakan masuk kembali."} />
        ) : null}
        <LoginForm lanjut={lanjut} />
      </CardContent>
    </Card>
  );
}
