"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubmitSuccess {
  notebookId: string;
  slug: string;
  previewUrl: string;
}

interface SubmitError {
  error: string;
  code: string;
}

export function SubmitForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formEl = e.currentTarget;
      const formData = new FormData(formEl);

      const res = await fetch("/api/notebooks", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as SubmitSuccess;
        router.push(`/@chris/${data.slug}`);
        return;
      }

      let message = "Something went wrong. Please try again.";
      try {
        const errBody = (await res.json()) as SubmitError;
        if (errBody && errBody.error) {
          message = errBody.error;
          if (errBody.code === "NBCONVERT_MISSING") {
            message =
              "Server can't render notebooks right now. Please try again later.";
          }
        }
      } catch {
        // keep generic if body not JSON
      }
      setError(message);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <fieldset
        disabled={loading}
        className="rounded-lg border border-ink-800 bg-ink-900 p-5 disabled:opacity-60"
      >
        <legend className="px-2 text-sm text-moon-200">Source</legend>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-moon-200">
              Upload <code className="font-mono">.ipynb</code> file
            </span>
            <input
              type="file"
              name="file"
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

      <fieldset
        disabled={loading}
        className="rounded-lg border border-ink-800 bg-ink-900 p-5 space-y-4 disabled:opacity-60"
      >
        <legend className="px-2 text-sm text-moon-200">
          About this notebook
        </legend>

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
            Link to original study{" "}
            <span className="text-ink-500">(optional)</span>
          </span>
          <input
            type="url"
            name="studyUrl"
            placeholder="https://www.aeaweb.org/articles?id=..."
            className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-moon-200">
            Study title <span className="text-ink-500">(optional)</span>
          </span>
          <input
            type="text"
            name="studyTitle"
            placeholder="Card & Krueger (1994). Minimum Wages and Employment. American Economic Review."
            className="mt-2 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-moon-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none"
          />
        </label>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-500">
          You must be signed in to publish. Drafts are private until you hit
          publish.
        </span>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-md bg-accent-500 text-ink-950 font-medium hover:bg-accent-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processing…" : "Continue"}
        </button>
      </div>

      {loading && (
        <p className="text-xs text-ink-500">
          Uploading notebook and rendering with nbconvert. This may take a
          moment…
        </p>
      )}
    </form>
  );
}