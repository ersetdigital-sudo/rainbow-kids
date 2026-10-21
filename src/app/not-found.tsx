import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-2xl font-bold mb-2">Halaman tidak ditemukan</h1>
      <p className="text-sm mb-6" style={{ color: "var(--mu)" }}>
        Alamat yang kamu buka tidak tersedia di business suite Rainbow Kids.
      </p>
      <Link href="/" className="btn p">
        Kembali ke dashboard
      </Link>
    </div>
  );
}
