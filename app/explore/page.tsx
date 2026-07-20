import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Explore notebooks
      </h1>
      <p className="mt-2 leading-7 text-slate-600">
        Discovery is not active. The pilot begins with a bounded cohort and
        assigned reviewers; search and filtering remain deferred.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-600">
          For now, review the{" "}
          <Link
            href="/#recent"
            className="font-semibold text-signal hover:underline"
          >
            fictional example records on the homepage
          </Link>
          .
        </p>
      </div>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-semibold text-signal hover:underline"
      >
        ← Home
      </Link>
    </div>
  );
}
