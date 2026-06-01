import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a notebook",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-moon-50">
          Submit a notebook
        </h1>
        <p className="mt-2 text-ink-500">
          Upload a <code className="font-mono">.ipynb</code> file or point us at
          one on GitHub. We&apos;ll render it, store it, and give it a
          permanent home on your profile.
        </p>
      </header>

      <form
        // Wired up in Phase 1 — see TODO.md.
        action="/api/notebooks"
        method="post"
        encType="multipart/form-data"
        className="mt-8 space-y-6"
      >
        {/* Source */}
        <fieldset className="rounded-lg border border-ink-800 bg-ink-900 p-5">
          <legend className="px-2 text-sm text-moon-200">Source</legend>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-moon-200">
                Upload <code className="font-mono">.ipynb</code> file
              </span>
              <input
                type="file"
                name="ipynb"
                accept=".ipynb,application/json"
                className="mt-2 block w-full text-sm text-ink-500 file:mr-3 file:rounded-md file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:text-moon-100 hover:file:bg-ink-700"
              />
            </label>

            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-ink-500">
              <span className="h-px flex-1 bg-ink-800" aria-hidden />
              <span>or</span>
              <span className="h-px flex-1 bg-ink-800" aria-hidden />
            </div>

            <label className="block">
              <span className="text-sm text-moon-200">GitHub URL</span>
              <input
                type="url"
                name="githubUrl"
                placeholder="https://github.com/user/repo/blob/main/analysis.ipynb"
                className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-ink-500">
                We&apos;ll fetch and store the raw notebook.
              </span>
            </label>
          </div>
        </fieldset>

        {/* Metadata */}
        <fieldset className="rounded-lg border border-ink-800 bg-ink-900 p-5 space-y-4">
          <legend className="px-2 text-sm text-moon-200">About this notebook</legend>

          <label className="block">
            <span className="text-sm text-moon-200">Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              placeholder="Replicating Card & Krueger (1994)"
              className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-moon-200">Description</span>
            <textarea
              name="description"
              rows={4}
              placeholder="What does this notebook show? What study or question does it address?"
              className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-moon-200">Tags</span>
            <input
              type="text"
              name="tags"
              placeholder="economics, replication, diff-in-diff"
              className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-ink-500">
              Comma-separated. Used for topic pages.
            </span>
          </label>

          <label className="block">
            <span className="text-sm text-moon-200">
              Link to original study <span className="text-ink-500">(optional)</span>
            </span>
            <input
              type="url"
              name="studyUrl"
              placeholder="https://www.aeaweb.org/articles?id=..."
              className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
            />
          </label>
        </fieldset>

        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-500">
            You must be signed in to publish. Drafts are private until you hit
            publish.
          </span>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-md bg-accent-500 text-ink-950 font-medium hover:bg-accent-600 transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
