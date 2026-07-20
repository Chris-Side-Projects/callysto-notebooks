import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-6 py-10 text-sm text-slate-600 sm:flex-row">
        <div>
          <div className="font-semibold text-ink">Callysto</div>
          <div className="mt-1">
            An open home for executable, reviewable analysis.
          </div>
        </div>
        <div className="flex gap-6">
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>
          <Link href="/submit" className="hover:text-ink">
            Submit
          </Link>
          <Link
            href="https://github.com/Chris-Side-Projects/callysto-notebooks"
            className="hover:text-ink"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
