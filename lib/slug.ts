import type { Db } from "./db";

/**
 * Generate a kebab-case slug from a title.
 * - Lowercase
 * - Alphanumeric + hyphens only (strips everything else)
 * - Collapses runs of spaces/hyphens into single hyphen
 * - Truncates to max 60 chars
 * - Falls back to "notebook" for empty input
 */
export function generateSlug(title: string): string {
  if (!title || typeof title !== "string") {
    return "notebook";
  }
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return "notebook";
  return slug.length > 60 ? slug.slice(0, 60).replace(/-$/, "") : slug;
}

/**
 * Return a unique slug for the given owner.
 * Starts with generateSlug(title). If collision on (ownerId, slug),
 * tries title-2, title-3, ... up to a safe limit then falls back.
 */
export async function uniqueSlug(
  title: string,
  ownerId: string,
  db: Db,
): Promise<string> {
  const base = generateSlug(title);
  const baseHit = await db.query.notebooks.findFirst({
    where: (n, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(n.ownerId, ownerId), eqOp(n.slug, base)),
    columns: { id: true },
  });
  if (!baseHit) {
    return base;
  }

  let n = 2;
  const maxAttempts = 100;
  while (n <= maxAttempts) {
    const candidate = `${base}-${n}`;
    const hit = await db.query.notebooks.findFirst({
      where: (nb, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(nb.ownerId, ownerId), eqOp(nb.slug, candidate)),
      columns: { id: true },
    });
    if (!hit) {
      return candidate;
    }
    n += 1;
  }
  return `${base}-${Date.now()}`;
}