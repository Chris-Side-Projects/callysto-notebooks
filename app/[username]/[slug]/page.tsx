type NotebookPageParams = {
  params: Promise<{
    slug: string;
    username: string;
  }>;
};

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function displayUsername(username: string) {
  return username.startsWith("@") ? username : `@${username}`;
}

export default async function NotebookDetailPage({ params }: NotebookPageParams) {
  const { slug, username } = await params;
  const title = titleFromSlug(slug);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-slate-500">{displayUsername(username)}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          A rendered notebook will appear here after the upload-time conversion pipeline stores
          HTML in Cloudflare R2. This placeholder keeps the read path visible without adding
          runtime execution infrastructure.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Python</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">replication</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">published</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3 text-sm font-medium text-slate-500">
            Rendered notebook
          </div>
          <div className="space-y-5 p-5">
            <section className="rounded-md border border-slate-200 bg-paper p-4">
              <p className="font-mono text-sm text-slate-500">In [1]:</p>
              <pre className="mt-3 overflow-x-auto text-sm text-slate-800">
                <code>{"import pandas as pd\nstudy = pd.read_csv('study-data.csv')\nstudy.head()"}</code>
              </pre>
            </section>
            <section className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">Output</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-600">
                <span className="rounded bg-slate-100 p-2">cohort</span>
                <span className="rounded bg-slate-100 p-2">outcome</span>
                <span className="rounded bg-slate-100 p-2">weight</span>
              </div>
            </section>
          </div>
        </article>

        <aside className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight">Comments</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cell-level review threads will live here, including top-level notebook discussion and
            threaded replies.
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Cell 1</p>
              <p className="mt-2 text-sm text-slate-600">
                Confirm the raw dataset checksum before interpreting the first summary table.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Notebook</p>
              <p className="mt-2 text-sm text-slate-600">
                Add the original study URL once metadata editing is wired up.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
