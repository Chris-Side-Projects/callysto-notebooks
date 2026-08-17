import { connection } from "next/server";
import { notFound } from "next/navigation";

import { IsolatedOutput } from "@/components/m0/IsolatedOutput";
import {
  isM0ProofEnabled,
  isValidProofId,
  proofArtifactDescriptors,
} from "@/lib/m0/proof";

export const dynamic = "force-dynamic";

type ProofPageProps = {
  searchParams: Promise<{ proof?: string | string[] }>;
};

function artifact(id: string) {
  const descriptor = proofArtifactDescriptors.find(
    (candidate) => candidate.id === id,
  );
  if (!descriptor) {
    throw new Error(`M0 proof artifact is missing: ${id}`);
  }
  return descriptor;
}

export default async function IsolationProofPage({
  searchParams,
}: ProofPageProps) {
  await connection();
  if (!isM0ProofEnabled()) {
    notFound();
  }
  const requestedProof = (await searchParams).proof;
  const proofId =
    typeof requestedProof === "string" ? requestedProof : "manual-proof";
  if (!isValidProofId(proofId)) {
    notFound();
  }
  const hostileHtml = artifact("hostile-html");
  const hostileSvg = artifact("hostile-svg");
  const laterHtml = artifact("later-html");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10" data-proof-id={proofId}>
      <header className="border-b border-slate-300 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal">
          Milestone 0 synthetic security proof
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
          App-owned notebook shell with isolated outputs
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          Callysto owns these inert cell wrappers and anchors. Author-supplied
          rich output is served from a different loopback host through
          short-lived signed capabilities. Nothing on this page is a real
          publication or a scientific verification.
        </p>
      </header>

      <main className="mt-8 space-y-8" id="notebook-proof">
        <section
          aria-labelledby="cell-proof-code-label"
          className="rounded border border-slate-300 bg-white p-5"
          data-cell-id="proof-code-cell"
          id="cell-proof-code-cell"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold" id="cell-proof-code-label">
              Cell 1 · escaped code
            </h2>
            <span className="text-xs text-slate-500">
              Review anchor: proof-code-cell
            </span>
          </div>
          <pre className="mt-4 overflow-x-auto rounded bg-slate-100 p-4 text-sm">
            <code>
              {'<img src=x onerror="window.__appOwnedShellEscaped=false">'}
            </code>
          </pre>
        </section>

        <section
          aria-labelledby="cell-hostile-html-label"
          className="rounded border border-slate-300 bg-slate-50 p-5"
          data-cell-id="proof-hostile-html-cell"
          id="cell-proof-hostile-html-cell"
        >
          <h2 className="mb-4 font-semibold" id="cell-hostile-html-label">
            Cell 2 · isolated hostile HTML
          </h2>
          <IsolatedOutput
            outputId={hostileHtml.id}
            proofId={proofId}
            title={hostileHtml.title}
          />
        </section>

        <section
          aria-labelledby="cell-hostile-svg-label"
          className="rounded border border-slate-300 bg-slate-50 p-5"
          data-cell-id="proof-hostile-svg-cell"
          id="cell-proof-hostile-svg-cell"
        >
          <h2 className="mb-4 font-semibold" id="cell-hostile-svg-label">
            Cell 3 · isolated hostile SVG
          </h2>
          <IsolatedOutput
            outputId={hostileSvg.id}
            proofId={proofId}
            title={hostileSvg.title}
          />
        </section>

        <div
          aria-hidden="true"
          className="min-h-[150vh] border-l border-dashed border-slate-300"
        />

        <section
          aria-labelledby="cell-later-label"
          className="rounded border border-slate-300 bg-slate-50 p-5"
          data-cell-id="proof-later-cell"
          id="cell-proof-later-cell"
        >
          <h2 className="mb-4 font-semibold" id="cell-later-label">
            Cell 4 · later lazy output
          </h2>
          <IsolatedOutput
            outputId={laterHtml.id}
            proofId={proofId}
            title={laterHtml.title}
          />
        </section>
      </main>
    </div>
  );
}
