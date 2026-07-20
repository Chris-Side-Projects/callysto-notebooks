import {
  NotebookCard,
  type NotebookCardProps,
} from "@/components/NotebookCard";
import Link from "next/link";

const recentNotebooks: NotebookCardProps[] = [
  {
    author: "mira",
    description:
      "A fictional example showing how reviewers could discuss confidence intervals, sampling assumptions, and sensitivity checks.",
    href: "/@mira/replicating-classroom-outcomes",
    language: "Python",
    reviewState: "Open review",
    tags: ["education", "statistics", "replication"],
    title: "Replicating Classroom Outcomes",
  },
  {
    author: "arden",
    description:
      "A fictional notebook walkthrough for testing whether a headline trend survives alternate data-cleaning filters.",
    href: "/@arden/air-quality-trend-audit",
    language: "Python",
    reviewState: "Owner addressed",
    tags: ["climate", "pandas", "audit"],
    title: "Air Quality Trend Audit",
  },
  {
    author: "jlee",
    description:
      "A fictional cell-level review illustrating model diagnostics and robustness questions.",
    href: "/@jlee/nutrition-regression-review",
    language: "R",
    reviewState: "Reviewer resolved",
    tags: ["health", "regression", "review"],
    title: "Nutrition Regression Review",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Product demonstration
            </p>
            <p className="text-sm font-semibold uppercase tracking-wide text-signal">
              Contextual review for computational claims
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-ink">
              Publish the analysis, review the methods, improve the result.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Callysto is being designed as a public review layer for the
              notebooks behind studies, audits, and data-driven claims. This
              scaffold demonstrates the intended reading experience; publishing
              and commenting are not active.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                View submission status
              </Link>
              <a
                href="#recent"
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Browse recent
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-md bg-white p-4 font-mono text-sm leading-7 text-slate-700 shadow-sm">
              <p className="text-slate-500">In [12]:</p>
              <p>model = sm.OLS(outcome, predictors).fit()</p>
              <p>model.summary()</p>
              <div className="mt-4 rounded border border-slate-200 bg-paper p-3 font-sans text-sm text-slate-600">
                R-squared: 0.68 · p-value: 0.014 · 3 review threads
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recent" className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Example review records
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Fictional fixtures for reviewing the proposed information
              architecture.
            </p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recentNotebooks.map((notebook) => (
            <NotebookCard key={notebook.href} {...notebook} />
          ))}
        </div>
      </section>
    </div>
  );
}
