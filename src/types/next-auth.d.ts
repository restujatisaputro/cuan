import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

// next-auth/jwt hanya meneruskan ekspor dari @auth/core/jwt, sehingga
// augmentasi harus menyasar modul aslinya agar tipe token ikut terbaca.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
