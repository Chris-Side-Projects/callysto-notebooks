import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-full bg-signal ring-1 ring-blue-300"
          />
          <span className="font-semibold tracking-tight text-ink transition-colors group-hover:text-slate-700">
            Callysto
          </span>
          <span className="hidden text-xs text-slate-500 sm:inline">
            notebooks
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/explore"
            className="rounded-md px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
          >
            Explore
          </Link>
          <Link
            href="/submit"
            className="rounded-md px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
          >
            Submit
          </Link>
          <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden />
          <Link
            href="/topics"
            className="rounded-md px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
          >
            Topics
          </Link>
          <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden />
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/submit"
            className="rounded-md bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-slate-800"
          >
            Pilot status
          </Link>
        </nav>
      </div>
    </header>
  );
}
