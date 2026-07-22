import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notebooks, users } from "@/lib/db/schema";
import { getR2Url } from "@/lib/r2";

export type NotebookDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tags: string[];
  studyUrl: string | null;
  studyTitle: string | null;
  kernelLanguage: string;
  cellCount: number;
  publishedAt: Date | null;
  voteCount: number;
  forkCount: number;
  commentCount: number;
  htmlPreviewUrl: string;
  owner: {
    username: string;
    displayName: string;
  };
};

/**
 * Load a notebook by public @username + slug. Returns null when not found or DB is unavailable.
 */
export async function findNotebookByUsernameAndSlug(
  username: string,
  slug: string,
): Promise<NotebookDetail | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select({
      id: notebooks.id,
      slug: notebooks.slug,
      title: notebooks.title,
      description: notebooks.description,
      tags: notebooks.tags,
      studyUrl: notebooks.studyUrl,
      studyTitle: notebooks.studyTitle,
      kernelLanguage: notebooks.kernelLanguage,
      cellCount: notebooks.cellCount,
      publishedAt: notebooks.publishedAt,
      voteCount: notebooks.voteCount,
      forkCount: notebooks.forkCount,
      commentCount: notebooks.commentCount,
      htmlPath: notebooks.htmlPath,
      ownerUsername: users.username,
      ownerDisplayName: users.displayName,
    })
    .from(notebooks)
    .innerJoin(users, eq(notebooks.ownerId, users.id))
    .where(and(eq(users.username, username), eq(notebooks.slug, slug)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  let htmlPreviewUrl: string;
  try {
    htmlPreviewUrl = getR2Url(row.htmlPath);
  } catch {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: row.tags,
    studyUrl: row.studyUrl,
    studyTitle: row.studyTitle,
    kernelLanguage: row.kernelLanguage,
    cellCount: row.cellCount,
    publishedAt: row.publishedAt,
    voteCount: row.voteCount,
    forkCount: row.forkCount,
    commentCount: row.commentCount,
    htmlPreviewUrl,
    owner: {
      username: row.ownerUsername,
      displayName: row.ownerDisplayName,
    },
  };
}