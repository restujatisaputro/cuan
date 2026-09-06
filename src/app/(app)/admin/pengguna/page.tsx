import type { Metadata } from "next";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/form-feedback";
import { CreateUserDialog } from "@/features/users/components/create-user-dialog";
import { UserStatusToggle } from "@/features/users/components/user-status-toggle";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Manajemen Pengguna" };

const tanggal = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

export default async function HalamanPengguna() {
  const admin = await wajibAdmin();

  // Admin hanya melihat data akun pengguna, bukan transaksi keuangannya.
  const pengguna = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground text-sm">
            Kelola akses aplikasi. Data keuangan tiap pengguna tetap tertutup
            bagi administrator.
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar pengguna ({pengguna.length})
          </CardTitle>
          <CardDescription>
            Menonaktifkan pengguna membuatnya tidak bisa masuk, tanpa menghapus
            datanya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pengguna.length === 0 ? (
            <EmptyState
              icon={<Users className="size-8" aria-hidden />}
              judul="Belum ada pengguna"
              keterangan="Tambahkan pengguna pertama lewat tombol di atas."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Terdaftar</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pengguna.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        <span className="text-muted-foreground block text-xs sm:hidden">
                          {item.email}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.role === "ADMIN" ? "default" : "secondary"}
                        >
                          {item.role === "ADMIN" ? "Admin" : "Pengguna"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "outline" : "destructive"}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {tanggal.format(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <UserStatusToggle
                            userId={item.id}
                            isActive={item.isActive}
                            nama={item.name}
                            dirinyaSendiri={item.id === admin.id}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
