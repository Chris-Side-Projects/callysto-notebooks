import Link from "next/link";
import { NotebookCard } from "@/components/NotebookCard";
import { mockNotebooks } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-800">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-500">
              Reproducible notebooks for open science
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-moon-50">
              Publish the analysis.{" "}
              <span className="text-accent-500">Review the methods.</span>{" "}
              Improve the result.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-500">
              Callysto is a public home for Jupyter notebooks behind studies,
              audits, and data-driven claims. Read rendered notebooks, discuss
              specific cells, fork and run analyses in your browser — no server
              required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent-600 transition-colors"
              >
                Submit a notebook
              </Link>
              <Link
                href="/explore"
                className="rounded-md border border-ink-700 px-5 py-2.5 text-sm font-semibold text-moon-100 hover:bg-ink-800 transition-colors"
              >
                Browse all
              </Link>
            </div>
          </div>

          {/* Code preview panel */}
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-5">
            <div className="rounded-md bg-ink-800 p-4 font-mono text-sm leading-7 text-moon-200 shadow-sm">
              <p className="text-ink-500">In [12]:</p>
              <p className="text-moon-100">model = sm.OLS(outcome, predictors).fit()</p>
              <p className="text-moon-100">model.summary()</p>
              <div className="mt-4 rounded border border-ink-700 bg-ink-950 p-3 font-sans text-sm text-ink-500">
                R-squared: 0.68 · p-value: 0.014 ·{" "}
                <span className="text-accent-500">3 review threads</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent notebooks */}
      <section id="recent" className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-moon-100">
              Recent Notebooks
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Freshly published analyses ready for review.
            </p>
          </div>
          <Link href="/explore" className="text-sm text-ink-500 hover:text-moon-100">
            Browse all →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mockNotebooks.map((nb) => (
            <NotebookCard
              key={`${nb.owner.username}/${nb.slug}`}
              notebook={nb}
            />
          ))}
        </div>
      </section>
    </>
  );
}
