import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-moon-50">
        Explore notebooks
      </h1>
      <p className="mt-2 text-ink-500">
        Full search, filters (tag, language, date, vote count), and pagination —
        coming in Phase 1.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-ink-700 p-8 text-center">
        <p className="text-sm text-ink-500">
          For now, check out the{" "}
          <Link href="/#recent" className="text-accent-500 hover:underline">
            recent notebooks on the homepage
          </Link>
          .
        </p>
      </div>
      <Link href="/" className="mt-8 inline-block text-sm text-ink-500 hover:text-moon-100">
        ← Home
      </Link>
    </div>
  );
}
