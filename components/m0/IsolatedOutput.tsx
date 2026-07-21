"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CapabilityResponse = {
  artifactUrl: string;
  audience: "public";
  expiresAt: number;
  outputId: string;
  renderRevisionId: string;
};

type OutputState =
  | { status: "idle" | "loading" }
  | { code: string; status: "error" | "unavailable" }
  | { artifactUrl: string; expiresAt: number; status: "ready" };

export function IsolatedOutput({
  outputId,
  proofId,
  title,
}: {
  outputId: string;
  proofId: string;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const requestSequence = useRef(0);
  const [nearViewport, setNearViewport] = useState(false);
  const [state, setState] = useState<OutputState>({ status: "idle" });

  const issueCapability = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setState((current) =>
      current.status === "ready" ? current : { status: "loading" },
    );
    try {
      const response = await fetch("/api/m0/capabilities", {
        body: JSON.stringify({ audience: "public", outputId, proofId }),
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as Partial<CapabilityResponse> & {
        code?: string;
      };
      if (sequence !== requestSequence.current) {
        return;
      }
      if (response.status === 410) {
        setState({
          code: body.code ?? "RENDER_RESTRICTED",
          status: "unavailable",
        });
        return;
      }
      if (
        !response.ok ||
        typeof body.artifactUrl !== "string" ||
        typeof body.expiresAt !== "number" ||
        body.outputId !== outputId
      ) {
        setState({
          code: body.code ?? "CAPABILITY_ISSUANCE_FAILED",
          status: "error",
        });
        return;
      }
      setState({
        artifactUrl: body.artifactUrl,
        expiresAt: body.expiresAt,
        status: "ready",
      });
    } catch {
      if (sequence === requestSequence.current) {
        setState({ code: "CAPABILITY_NETWORK_FAILED", status: "error" });
      }
    }
  }, [outputId, proofId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNearViewport(entry.isIntersecting);
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          void issueCapability();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [issueCapability]);

  useEffect(() => {
    if (!nearViewport || state.status !== "ready") {
      return;
    }
    const delay = Math.max(0, state.expiresAt - Date.now() + 25);
    const timer = window.setTimeout(() => {
      void issueCapability();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [issueCapability, nearViewport, state]);

  return (
    <div
      className="min-h-56 rounded border border-slate-300 bg-white p-3"
      data-output-id={outputId}
      data-output-status={state.status}
      ref={containerRef}
    >
      <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-600">
        <span>{title}</span>
        <span>Separate cookieless origin</span>
      </div>
      {state.status === "idle" ? (
        <p className="py-16 text-center text-sm text-slate-500">
          Output waits until it approaches the viewport.
        </p>
      ) : null}
      {state.status === "loading" ? (
        <p
          aria-live="polite"
          className="py-16 text-center text-sm text-slate-600"
        >
          Requesting short-lived output access…
        </p>
      ) : null}
      {state.status === "ready" ? (
        <iframe
          className="h-48 w-full border border-slate-200 bg-white"
          data-testid={`isolated-frame-${outputId}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox=""
          src={state.artifactUrl}
          title={`Author-supplied isolated output: ${title}`}
        />
      ) : null}
      {state.status === "unavailable" ? (
        <div className="py-12 text-center text-sm text-slate-700">
          <p
            aria-live="polite"
            className="font-medium"
            data-error-code={state.code}
          >
            Output unavailable because this proof render is restricted.
          </p>
          <button
            className="mt-3 min-h-11 rounded border border-slate-400 px-4 font-medium"
            onClick={() => void issueCapability()}
            type="button"
          >
            Check output again
          </button>
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className="py-12 text-center text-sm text-slate-700">
          <p data-error-code={state.code}>
            Output access could not be refreshed.
          </p>
          <button
            className="mt-3 min-h-11 rounded border border-slate-400 px-4 font-medium"
            onClick={() => void issueCapability()}
            type="button"
          >
            Retry output
          </button>
        </div>
      ) : null}
    </div>
  );
}
