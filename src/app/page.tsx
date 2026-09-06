import { redirect } from "next/navigation";

/** Halaman akar hanya mengarahkan; middleware yang menentukan tujuan akhir. */
export default function Beranda() {
  redirect("/dasbor");
}
