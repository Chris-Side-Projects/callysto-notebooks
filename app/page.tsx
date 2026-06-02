import { NotebookCard, type NotebookCardProps } from "@/components/NotebookCard";

const recentNotebooks: NotebookCardProps[] = [
  {
    author: "mira",
    commentCount: 8,
    description:
      "A reproducible look at confidence intervals, sampling assumptions, and sensitivity checks from a published education study.",
    forkCount: 3,
    href: "/@mira/replicating-classroom-outcomes",
    language: "Python",
    publishedAt: "Today",
    tags: ["education", "statistics", "replication"],
    title: "Replicating Classroom Outcomes",
    voteCount: 42
  },
  {
    author: "arden",
    commentCount: 5,
    description:
      "Notebook walkthrough for cleaning public air-quality data and testing whether the headline trend survives alternate filters.",
    forkCount: 2,
    href: "/@arden/air-quality-trend-audit",
    language: "Python",
    publishedAt: "Yesterday",
    tags: ["climate", "pandas", "audit"],
    title: "Air Quality Trend Audit",
    voteCount: 31
  },
  {
    author: "jlee",
    commentCount: 12,
    description:
      "A cell-by-cell review of the regression model behind a nutrition paper, including model diagnostics and robustness checks.",
    forkCount: 6,
    href: "/@jlee/nutrition-regression-review",
    language: "R",
    publishedAt: "May 30",
    tags: ["health", "regression", "review"],
    title: "Nutrition Regression Review",
    voteCount: 57
  }
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-signal">
              Reproducible notebooks for open science
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-ink">
              Publish the analysis, review the methods, improve the result.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Callysto is a public home for Jupyter notebooks behind studies, audits, and
              data-driven claims. Read rendered notebooks, discuss specific cells, and build a
              durable record of reproducible work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/submit" className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Submit a notebook
              </a>
              <a href="#recent" className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Browse recent
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-md bg-white p-4 font-mono text-sm leading-7 text-slate-700 shadow-sm">
              <p className="text-slate-400">In [12]:</p>
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
            <h2 className="text-2xl font-semibold tracking-tight">Recent Notebooks</h2>
            <p className="mt-2 text-sm text-slate-600">
              Freshly published analyses ready for review.
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
