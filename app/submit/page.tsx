export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-signal">Publish</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Submit a notebook</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Upload an `.ipynb` file or point Callysto at a public GitHub notebook URL. Processing and
          storage will be wired in Phase 1.
        </p>
      </div>

      <form className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-800">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-signal focus:ring-2 focus:ring-blue-100"
            placeholder="Replication of..."
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-800">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-signal focus:ring-2 focus:ring-blue-100"
            placeholder="What question does this notebook answer?"
          />
        </div>

        <div>
          <label htmlFor="notebook" className="block text-sm font-medium text-slate-800">
            Notebook file
          </label>
          <input
            id="notebook"
            name="notebook"
            type="file"
            accept=".ipynb,application/x-ipynb+json,application/json"
            className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </div>

        <div>
          <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-800">
            GitHub notebook URL
          </label>
          <input
            id="githubUrl"
            name="githubUrl"
            type="url"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-signal focus:ring-2 focus:ring-blue-100"
            placeholder="https://github.com/org/repo/blob/main/notebook.ipynb"
          />
        </div>

        <div>
          <label htmlFor="studyUrl" className="block text-sm font-medium text-slate-800">
            Original study URL
          </label>
          <input
            id="studyUrl"
            name="studyUrl"
            type="url"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-signal focus:ring-2 focus:ring-blue-100"
            placeholder="https://doi.org/..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save draft
          </button>
        </div>
      </form>
    </div>
  );
}
