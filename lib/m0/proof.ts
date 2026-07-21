import proofArtifacts from "@/contracts/m0-isolation-proof-artifacts.json";

export const M0_RENDER_REVISION_ID = "rr-m0-isolation-v1";
export const M0_PREVIEW_DRAFT_ID = "draft-m0-isolation";
export const M0_PREVIEW_DRAFT_GENERATION = 7;

export type ProofArtifact = {
  id: string;
  mime: string;
  title: string;
};

export const proofArtifactDescriptors: ProofArtifact[] = proofArtifacts.map(
  ({ id, mime, title }) => ({ id, mime, title }),
);

const proofArtifactIds = new Set(proofArtifactDescriptors.map(({ id }) => id));
const proofIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const proofGlobal = globalThis as typeof globalThis & {
  __callystoM0RestrictionState?: Map<string, boolean>;
};
const restrictionState =
  proofGlobal.__callystoM0RestrictionState ?? new Map<string, boolean>();
proofGlobal.__callystoM0RestrictionState = restrictionState;

export function isM0ProofEnabled(): boolean {
  return process.env.M0_PROOF_ENABLED === "1";
}

export function isKnownProofArtifact(outputId: string): boolean {
  return proofArtifactIds.has(outputId);
}

export function isValidProofId(proofId: string): boolean {
  return proofIdPattern.test(proofId);
}

export function isProofRestricted(proofId: string): boolean {
  return restrictionState.get(proofId) === true;
}

export function setProofRestricted(proofId: string, restricted: boolean): void {
  restrictionState.set(proofId, restricted);
}

export function parseBoundedTtl(name: string, maximum: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? maximum : Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

export function requireProofEnvironment(): {
  contentOrigin: string;
  keyId: string;
  privateKeyPem: string;
} {
  const contentOrigin = process.env.CONTENT_ORIGIN;
  const keyId = process.env.CONTENT_CAPABILITY_KEY_ID;
  const privateKeyPem = process.env.CONTENT_CAPABILITY_PRIVATE_KEY_PEM;
  if (!contentOrigin || !keyId || !privateKeyPem) {
    throw new Error(
      "CONTENT_ORIGIN, CONTENT_CAPABILITY_KEY_ID, and CONTENT_CAPABILITY_PRIVATE_KEY_PEM are required",
    );
  }
  const parsed = new URL(contentOrigin);
  if (
    !/^https?:$/.test(parsed.protocol) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("CONTENT_ORIGIN must be an exact HTTP(S) origin");
  }
  return { contentOrigin: parsed.origin, keyId, privateKeyPem };
}
