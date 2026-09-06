import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/features/users/components/profile-form";
import { PasswordForm } from "@/features/users/components/password-form";
import { wajibMasuk } from "@/lib/session";

export const metadata: Metadata = { title: "Profil" };

export default async function HalamanProfil() {
  const pengguna = await wajibMasuk();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <Badge variant={pengguna.role === "ADMIN" ? "default" : "secondary"}>
          {pengguna.role === "ADMIN" ? "Administrator" : "Pengguna"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data diri</CardTitle>
          <CardDescription>
            Nama, mata uang, dan zona waktu yang dipakai untuk menampilkan angka
            dan tanggal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            nama={pengguna.name}
            email={pengguna.email}
            currency={pengguna.currency}
            timezone={pengguna.timezone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ganti password</CardTitle>
          <CardDescription>
            Masukkan password saat ini untuk memastikan perubahan dilakukan oleh
            Anda sendiri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
