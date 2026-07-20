import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Topics" };

const TOPICS = [
  "machine-learning",
  "bayesian",
  "single-cell",
  "causal-inference",
  "climate",
  "reproducibility",
  "statistics",
  "r",
  "polars",
  "pandas",
  "regression",
  "nlp",
  "genomics",
  "economics",
];

export default function TopicsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Product demonstration
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        Topics
      </h1>
      <p className="mt-2 leading-7 text-slate-600">
        These example labels illustrate a possible pilot taxonomy. Topic-based
        discovery and filtering are not active.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <span
            key={t}
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700"
          >
            {t}
          </span>
        ))}
      </div>
      <Link
        href="/"
        className="mt-10 inline-block text-sm font-semibold text-signal hover:underline"
      >
        ← Home
      </Link>
    </div>
  );
}
