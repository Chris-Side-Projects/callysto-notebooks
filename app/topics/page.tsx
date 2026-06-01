import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Topics" };

const TOPICS = [
  "machine-learning", "bayesian", "single-cell", "causal-inference",
  "climate", "reproducibility", "statistics", "r", "polars", "pandas",
  "regression", "nlp", "genomics", "economics",
];

export default function TopicsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-moon-50">Topics</h1>
      <p className="mt-2 text-ink-500">Tag-based discovery — full filtering coming in Phase 1.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <span
            key={t}
            className="rounded-full border border-ink-700 px-4 py-1.5 text-sm text-ink-500 hover:border-ink-600 hover:text-moon-100 cursor-pointer transition-colors"
          >
            {t}
          </span>
        ))}
      </div>
      <Link href="/" className="mt-10 inline-block text-sm text-ink-500 hover:text-moon-100">
        ← Home
      </Link>
    </div>
  );
}
