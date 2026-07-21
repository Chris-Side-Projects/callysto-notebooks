import { NextResponse } from "next/server";

import {
  isM0ProofEnabled,
  isValidProofId,
  setProofRestricted,
} from "@/lib/m0/proof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreJson(body: object, status = 200): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isM0ProofEnabled()) {
    return noStoreJson({ code: "M0_PROOF_DISABLED" }, 404);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ code: "REQUEST_JSON_INVALID" }, 400);
  }
  if (typeof body !== "object" || body === null) {
    return noStoreJson({ code: "REQUEST_BODY_INVALID" }, 400);
  }
  const { proofId, restricted } = body as Record<string, unknown>;
  if (
    typeof proofId !== "string" ||
    !isValidProofId(proofId) ||
    typeof restricted !== "boolean"
  ) {
    return noStoreJson({ code: "RESTRICTION_REQUEST_INVALID" }, 400);
  }
  setProofRestricted(proofId, restricted);
  return noStoreJson({ proofId, restricted });
}
