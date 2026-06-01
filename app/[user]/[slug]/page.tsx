// Captures the `callysto.io/@username/notebook-slug` URL described in PLAN.md.
// Next.js reserves folder names starting with `@` for parallel routes, so the
// literal `@` lives inside the dynamic `[user]` segment and gets stripped here.

import Link from "next/link";
import { notFound } from "next/navigation";
import { findMockNotebook } from "@/lib/mock-data";
import { formatCount, formatRelativeTime } from "@/lib/format";

type Params = { user: string; slug: string };

export default async function NotebookPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { user, slug } = await params;

  if (!user.startsWith("@")) notFound();
  const username = user.slice(1);

  const notebook = findMockNotebook(username, slug);
  if (!notebook) notFound();

  return (
    <article className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <Link
            href={`/@${notebook.owner.username}`}
            className="text-moon-200 hover:text-white"
          >
            @{notebook.owner.username}
          </Link>
          <span aria-hidden>/</span>
          <span className="font-mono text-moon-100">{notebook.slug}</span>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-moon-50">
          {notebook.title}
        </h1>

        {notebook.description && (
          <p className="mt-3 text-ink-500 leading-relaxed">
            {notebook.description}
          </p>
        )}

        {notebook.studyUrl && (
          <p className="mt-3 text-sm text-ink-500">
            Replicates:{" "}
            <a
              href={notebook.studyUrl}
              className="text-accent-500 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {notebook.studyTitle ?? notebook.studyUrl}
            </a>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
          <span>Published {formatRelativeTime(notebook.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>{notebook.cellCount} cells</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{notebook.kernelLanguage}</span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-ink-700 text-moon-100 hover:bg-ink-800 transition-colors text-sm"
          >
            ▲ Upvote · {formatCount(notebook.voteCount)}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-ink-700 text-moon-100 hover:bg-ink-800 transition-colors text-sm"
          >
            ⑂ Fork · {formatCount(notebook.forkCount)}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-ink-700 text-moon-100 hover:bg-ink-800 transition-colors text-sm"
          >
            ▶ Run in browser
          </button>
        </div>

        {notebook.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {notebook.tags.map((tag) => (
              <Link
                key={tag}
                href={`/topics/${tag}`}
                className="text-xs rounded-full border border-ink-700 px-2.5 py-1 text-ink-500 hover:text-moon-100 hover:border-ink-600"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Rendered notebook placeholder */}
      <section
        aria-label="Notebook preview"
        className="mt-10 rounded-lg border border-ink-800 bg-ink-900"
      >
        <div className="border-b border-ink-800 px-5 py-3 text-xs text-ink-500 font-mono flex items-center justify-between">
          <span>{notebook.slug}.ipynb</span>
          <span>placeholder render</span>
        </div>
        <div className="p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center text-moon-300">
            📓
          </div>
          <p className="mt-4 text-moon-200">
            Rendered notebook HTML will appear here.
          </p>
          <p className="mt-2 text-sm text-ink-500 max-w-md mx-auto">
            On submission, the raw <code className="font-mono">.ipynb</code> is
            stored in R2 and a static HTML render (via{" "}
            <code className="font-mono">nbconvert</code>) is served from this
            slot.
          </p>
        </div>
      </section>

      {/* Comments placeholder */}
      <section aria-labelledby="comments-heading" className="mt-12">
        <h2
          id="comments-heading"
          className="text-xl font-semibold tracking-tight text-moon-100"
        >
          Comments
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {formatCount(notebook.commentCount)} threads · cell-level inline
          comments coming in Phase 2.
        </p>

        <div className="mt-4 rounded-lg border border-dashed border-ink-700 p-8 text-center text-sm text-ink-500">
          Sign in to leave a comment on this notebook — or on a specific cell.
        </div>
      </section>
    </article>
  );
}
