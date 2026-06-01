import Link from "next/link";

export type NotebookCardProps = {
  author: string;
  commentCount: number;
  description: string;
  forkCount: number;
  href: string;
  language: string;
  publishedAt: string;
  tags: string[];
  title: string;
  voteCount: number;
};

export function NotebookCard({
  author,
  commentCount,
  description,
  forkCount,
  href,
  language,
  publishedAt,
  tags,
  title,
  voteCount
}: NotebookCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs font-medium uppercase text-slate-500">
        <span>{language}</span>
        <span>{publishedAt}</span>
      </div>
      <Link href={href} className="group">
        <h3 className="text-lg font-semibold tracking-tight text-ink group-hover:text-signal">
          {title}
        </h3>
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-5 text-sm text-slate-500">
        <span>@{author}</span>
        <div className="flex gap-3">
          <span>{voteCount} votes</span>
          <span>{forkCount} forks</span>
          <span>{commentCount} comments</span>
        </div>
      </div>
    </article>
  );
}
