import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Daftar" };

// Jumlah pengguna dibaca saat permintaan, bukan saat build.
export const dynamic = "force-dynamic";

export default async function HalamanDaftar() {
  // Pengguna pertama otomatis menjadi administrator; beri tahu agar jelas.
  const belumAdaPengguna = (await prisma.user.count()) === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Buat akun</CardTitle>
        <CardDescription>
          {belumAdaPengguna
            ? "Anda pengguna pertama, jadi akun ini otomatis menjadi administrator."
            : "Akun Anda langsung dilengkapi kategori dan akun kas bawaan."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
