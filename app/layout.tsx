import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Callysto",
  description: "An open platform for publishing, reviewing, and collaborating on Jupyter notebooks."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <header className="border-b border-slate-200 bg-white/90">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Callysto
            </Link>
            <div className="flex items-center gap-5 text-sm font-medium text-slate-700">
              <Link href="/" className="hover:text-ink">
                Explore
              </Link>
              <Link href="/submit" className="hover:text-ink">
                Submit
              </Link>
              <button className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">
                Sign in
              </button>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
