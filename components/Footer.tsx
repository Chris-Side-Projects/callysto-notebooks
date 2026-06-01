import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-ink-800 mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row justify-between gap-6 text-sm text-ink-500">
        <div>
          <div className="font-semibold text-moon-200">Callysto</div>
          <div className="mt-1">An open home for executable, reviewable analysis.</div>
        </div>
        <div className="flex gap-6">
          <Link href="/explore" className="hover:text-moon-100">Explore</Link>
          <Link href="/submit" className="hover:text-moon-100">Submit</Link>
          <Link
            href="https://github.com/Chris-Side-Projects/callysto-notebooks"
            className="hover:text-moon-100"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
