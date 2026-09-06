import { describe, expect, it } from "vitest";
import { barisCsv, BOM, buatCsv, selCsv } from "@/lib/csv";

describe("selCsv", () => {
  it("meneruskan teks biasa apa adanya", () => {
    expect(selCsv("Belanja bulanan")).toBe("Belanja bulanan");
  });

  it("mengubah nilai kosong menjadi sel kosong", () => {
    expect(selCsv(null)).toBe("");
    expect(selCsv(undefined)).toBe("");
  });

  it("mengutip sel yang mengandung pemisah", () => {
    expect(selCsv("Listrik; air")).toBe('"Listrik; air"');
  });

  it("menggandakan tanda kutip di dalam sel", () => {
    expect(selCsv('Beli "kopi"')).toBe('"Beli ""kopi"""');
  });

  it("mengutip sel yang mengandung baris baru", () => {
    expect(selCsv("baris satu\nbaris dua")).toBe('"baris satu\nbaris dua"');
  });
});

describe("buatCsv", () => {
  it("menyusun berkas dengan BOM, CRLF, dan baris judul", () => {
    const berkas = buatCsv(
      ["Tanggal", "Nominal"],
      [
        ["2026-09-06", "175000"],
        ["2026-09-07", "50000"],
      ],
    );

    expect(berkas.startsWith(BOM)).toBe(true);
    expect(berkas.slice(1).split("\r\n")).toEqual([
      "Tanggal;Nominal",
      "2026-09-06;175000",
      "2026-09-07;50000",
      "",
    ]);
  });

  it("baris tetap aman walau isinya mengandung pemisah", () => {
    expect(barisCsv(["a", "b;c", null])).toBe('a;"b;c";');
  });
});
