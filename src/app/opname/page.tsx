import type { Metadata } from "next";
import { OpnameView } from "@/components/modules/opname/OpnameView";

export const metadata: Metadata = {
  title: "Stok Opname",
  description:
    "Bandingkan stok sistem dengan hitungan fisik, isi penyebab selisih, dan sesuaikan stok setelah disetujui Owner.",
  alternates: { canonical: "/opname" },
};

export default function OpnamePage() {
  return <OpnameView />;
}
