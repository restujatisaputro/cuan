import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/features/auth/schema";
import { cariPenggunaUntukLogin, verifyPassword } from "@/features/auth/service";
import type { Role } from "@/lib/constants";

/** Galat login dengan pesan yang aman ditampilkan ke pengguna. */
class LoginGagalError extends CredentialsSignin {
  code = "kredensial_salah";
}

class AkunNonaktifError extends CredentialsSignin {
  code = "akun_nonaktif";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email dan password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const hasil = loginSchema.safeParse(credentials);
        if (!hasil.success) throw new LoginGagalError();

        const pengguna = await cariPenggunaUntukLogin(hasil.data.email);
        // verifyPassword tetap dijalankan walau pengguna tidak ada supaya
        // waktu responsnya seragam (mencegah penebakan email terdaftar).
        const cocok = await verifyPassword(
          hasil.data.password,
          pengguna?.passwordHash,
        );

        if (!pengguna || !cocok) throw new LoginGagalError();
        if (!pengguna.isActive) throw new AkunNonaktifError();

        // passwordHash sengaja tidak ikut dikembalikan.
        return {
          id: pengguna.id,
          name: pengguna.name,
          email: pengguna.email,
          role: pengguna.role as Role,
        };
      },
    }),
  ],
});
