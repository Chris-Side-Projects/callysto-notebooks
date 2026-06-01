import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-ink-800 bg-ink-950/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            aria-hidden
            className="inline-block w-6 h-6 rounded-full bg-gradient-to-br from-moon-200 to-moon-400 ring-1 ring-moon-200/30"
          />
          <span className="font-semibold tracking-tight text-moon-100 group-hover:text-white transition-colors">
            Callysto
          </span>
          <span className="text-xs text-ink-500 hidden sm:inline">notebooks</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/explore"
            className="px-3 py-1.5 rounded-md text-moon-200 hover:text-white hover:bg-ink-800 transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/submit"
            className="px-3 py-1.5 rounded-md text-moon-200 hover:text-white hover:bg-ink-800 transition-colors"
          >
            Submit
          </Link>
          <span className="mx-2 h-5 w-px bg-ink-700" aria-hidden />
          <Link
            href="/topics"
            className="px-3 py-1.5 rounded-md text-moon-200 hover:text-white hover:bg-ink-800 transition-colors"
          >
            Topics
          </Link>
          <span className="mx-2 h-5 w-px bg-ink-700" aria-hidden />
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md text-moon-200 hover:text-white hover:bg-ink-800 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md bg-accent-500 text-ink-950 font-medium hover:bg-accent-600 transition-colors"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
