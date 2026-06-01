import Link from "next/link";
import type { MockNotebook } from "@/lib/mock-data";
import { formatCount, formatRelativeTime } from "@/lib/format";

type Props = {
  notebook: MockNotebook;
};

export function NotebookCard({ notebook }: Props) {
  const href = `/@${notebook.owner.username}/${notebook.slug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-ink-800 bg-ink-900 p-5 hover:border-ink-600 hover:bg-ink-800/60 transition-colors"
    >
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <span className="rounded bg-ink-800 px-2 py-0.5 font-mono text-moon-200">
          {notebook.kernelLanguage}
        </span>
        <span>{notebook.cellCount} cells</span>
        <span aria-hidden>·</span>
        <span>{formatRelativeTime(notebook.publishedAt)}</span>
      </div>

      <h3 className="mt-3 font-semibold text-moon-50 leading-snug group-hover:text-white">
        {notebook.title}
      </h3>

      <p className="mt-2 text-sm text-ink-500 line-clamp-3">
        {notebook.description}
      </p>

      {notebook.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {notebook.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs rounded-full border border-ink-700 px-2 py-0.5 text-ink-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-ink-800 flex items-center justify-between text-xs text-ink-500">
        <span>
          by{" "}
          <span className="text-moon-200">@{notebook.owner.username}</span>
        </span>
        <div className="flex items-center gap-4">
          <span title="upvotes">▲ {formatCount(notebook.voteCount)}</span>
          <span title="forks">⑂ {formatCount(notebook.forkCount)}</span>
          <span title="comments">💬 {formatCount(notebook.commentCount)}</span>
        </div>
      </div>
    </Link>
  );
}
