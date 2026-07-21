import { NextResponse } from "next/server";

import {
  type CapabilityAudience,
  CapabilityError,
  issueContentCapability,
} from "@/lib/m0/capability.mts";
import {
  isKnownProofArtifact,
  isM0ProofEnabled,
  isProofRestricted,
  isValidProofId,
  M0_PREVIEW_DRAFT_GENERATION,
  M0_PREVIEW_DRAFT_ID,
  M0_RENDER_REVISION_ID,
  parseBoundedTtl,
  requireProofEnvironment,
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
  const values = body as Record<string, unknown>;
  const proofId = values.proofId;
  const outputId = values.outputId;
  const audience = values.audience;
  if (
    typeof proofId !== "string" ||
    !isValidProofId(proofId) ||
    typeof outputId !== "string" ||
    !isKnownProofArtifact(outputId) ||
    (audience !== "public" && audience !== "preview")
  ) {
    return noStoreJson({ code: "CAPABILITY_REQUEST_INVALID" }, 400);
  }
  if (isProofRestricted(proofId)) {
    return noStoreJson({ code: "RENDER_RESTRICTED" }, 410);
  }

  const typedAudience: CapabilityAudience = audience;
  if (
    typedAudience === "preview" &&
    (values.draftId !== M0_PREVIEW_DRAFT_ID ||
      values.draftGeneration !== M0_PREVIEW_DRAFT_GENERATION)
  ) {
    return noStoreJson({ code: "PREVIEW_BINDING_MISMATCH" }, 409);
  }
  if (
    typedAudience === "public" &&
    (values.draftId !== undefined || values.draftGeneration !== undefined)
  ) {
    return noStoreJson({ code: "PUBLIC_DRAFT_AUTHORITY_FORBIDDEN" }, 400);
  }

  try {
    const { contentOrigin, keyId, privateKeyPem } = requireProofEnvironment();
    const ttlSeconds =
      typedAudience === "public"
        ? parseBoundedTtl("CONTENT_PUBLIC_TTL_SECONDS", 60)
        : parseBoundedTtl("CONTENT_PREVIEW_TTL_SECONDS", 300);
    const { expiresAt, token } = issueContentCapability({
      audience: typedAudience,
      ...(typedAudience === "preview"
        ? {
            draftGeneration: M0_PREVIEW_DRAFT_GENERATION,
            draftId: M0_PREVIEW_DRAFT_ID,
          }
        : {}),
      keyId,
      outputId,
      privateKeyPem,
      proofId,
      renderRevisionId: M0_RENDER_REVISION_ID,
      ttlSeconds,
    });
    const artifactUrl = new URL("/artifact", contentOrigin);
    artifactUrl.searchParams.set("cap", token);
    return noStoreJson({
      artifactUrl: artifactUrl.toString(),
      audience: typedAudience,
      expiresAt: expiresAt * 1000,
      outputId,
      renderRevisionId: M0_RENDER_REVISION_ID,
    });
  } catch (error) {
    const code =
      error instanceof CapabilityError
        ? error.code
        : "M0_PROOF_CONFIGURATION_INVALID";
    return noStoreJson({ code }, 500);
  }
}
