import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#dddada" }} className="px-4 py-6">
      <div className="site-wrapper">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4">
          <div className="text-sm text-gray-600">
            <span>© Dishoom 2025</span>
            <span className="mx-2">·</span>
            <Link href="/about" className="hover:text-dishoom-red">About</Link>
            <span className="mx-2">·</span>
            <Link href="/legal" className="hover:text-dishoom-red">Legal</Link>
            <span className="mx-2">·</span>
            <Link href="/contact" className="hover:text-dishoom-red">Contact</Link>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>Bollywood news, reviews &amp; gossip</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
