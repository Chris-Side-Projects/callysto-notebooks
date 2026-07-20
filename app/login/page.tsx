import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Sign in to Callysto
      </h1>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Product demonstration
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Sign-in is not available. Milestone 0 is validating GitHub and ORCID
        identity, verified private contact, account linking, and recovery
        behavior before an authentication provider is added.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex text-sm font-semibold text-signal hover:underline"
      >
        Return home
      </Link>
    </div>
  );
}
