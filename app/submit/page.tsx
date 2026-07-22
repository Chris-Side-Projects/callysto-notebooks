import { SubmitForm } from "@/components/SubmitForm";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-signal">
          Publish
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
          Submit a notebook
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Upload an <code className="font-mono text-sm">.ipynb</code> file or
          paste a public GitHub notebook URL. We store the raw file in R2 and
          render static HTML with nbconvert at upload time.
        </p>
      </div>

      <SubmitForm />
    </div>
  );
}