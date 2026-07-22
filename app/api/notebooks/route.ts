import { NextRequest, NextResponse } from "next/server";
import { getDb, type Db } from "@/lib/db";
import { notebooks, users } from "@/lib/db/schema";
import { uniqueSlug } from "@/lib/slug";
import { deleteFromR2, uploadToR2 } from "@/lib/r2";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000";
const PLACEHOLDER_USERNAME = "chris";

type ErrorCode =
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "INVALID_FORMAT"
  | "FETCH_FAILED"
  | "NBCONVERT_MISSING"
  | "RENDER_FAILED"
  | "STORAGE_FAILED"
  | "DB_ERROR"
  | "INTERNAL_ERROR";

interface ErrorBody {
  error: string;
  code: ErrorCode;
}

interface SuccessBody {
  notebookId: string;
  slug: string;
  previewUrl: string;
}

class NbconvertMissingError extends Error {
  constructor() {
    super("nbconvert missing");
    this.name = "NbconvertMissingError";
  }
}

function isErrno(e: unknown): e is NodeJS.ErrnoException {
  return (
    e !== null &&
    typeof e === "object" &&
    "code" in (e as Record<string, unknown>)
  );
}

function isPgUniqueViolation(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "23505") return true;
  const cause = (err as { cause?: { code?: string } }).cause;
  return cause?.code === "23505";
}

function isNbconvertMissingOutput(stderr: string, stdout: string): boolean {
  const combined = `${stderr}\n${stdout}`.toLowerCase();
  return (
    combined.includes("no module named 'nbconvert'") ||
    combined.includes('no module named "nbconvert"') ||
    combined.includes("no module named nbconvert") ||
    combined.includes("modulenotfounderror") && combined.includes("nbconvert")
  );
}

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}

function getString(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" ? v : null;
}

function getFile(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  if (v instanceof File && v.size > 0) return v;
  return null;
}

/**
 * Convert github.com/.../blob/... URLs to raw.githubusercontent.com.
 * Ref segments may contain slashes (e.g. feature/my-branch).
 */
function toRawGithubUrl(url: string): string {
  if (url.includes("raw.githubusercontent.com")) {
    return url;
  }
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/,
  );
  if (match) {
    const [, user, repo, refAndPath] = match;
    return `https://raw.githubusercontent.com/${user}/${repo}/${refAndPath}`;
  }
  return url;
}

async function resolveOwnerId(db: Db): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: (u, { or, eq: eqOp }) =>
      or(
        eqOp(u.id, PLACEHOLDER_USER_ID),
        eqOp(u.username, PLACEHOLDER_USERNAME),
      ),
    columns: { id: true },
  });
  if (existing) return existing.id;

  try {
    await db.insert(users).values({
      id: PLACEHOLDER_USER_ID,
      username: PLACEHOLDER_USERNAME,
      email: "chris@example.com",
      authProvider: "github",
      authProviderId: "seed-placeholder-chris",
      displayName: "Chris",
    });
    return PLACEHOLDER_USER_ID;
  } catch (err: unknown) {
    if (!isPgUniqueViolation(err)) {
      throw err;
    }
  }

  const fallback = await db.query.users.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.username, PLACEHOLDER_USERNAME),
    columns: { id: true },
  });
  if (!fallback) {
    throw new Error("Failed to resolve placeholder owner user");
  }
  return fallback.id;
}

async function cleanupR2Keys(keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await deleteFromR2(key);
    } catch (err) {
      console.error("[notebooks] R2 cleanup failed for key", key, err);
    }
  }
}

async function renderNotebookToHtml(
  ipynbJsonText: string,
  notebookId: string,
): Promise<string> {
  const tempPath = join(tmpdir(), `${notebookId}.ipynb`);
  await writeFile(tempPath, ipynbJsonText, "utf8");

  try {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(
        "python3",
        ["-m", "nbconvert", "--to", "html", "--stdout", tempPath],
        {
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timeoutMs = 60_000;
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
      }, timeoutMs);

      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        handler();
      };

      if (child.stdout) {
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
      }
      if (child.stderr) {
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
      }

      child.on("error", (err: unknown) => {
        finish(() => {
          if (isErrno(err) && err.code === "ENOENT") {
            reject(new NbconvertMissingError());
          } else {
            reject(err);
          }
        });
      });

      child.on("close", (code) => {
        finish(() => {
          if (code === 0) {
            resolve(stdout);
            return;
          }
          if (isNbconvertMissingOutput(stderr, stdout)) {
            reject(new NbconvertMissingError());
            return;
          }
          reject(
            new Error(
              `nbconvert exited with code ${code}: ${stderr.slice(0, 500)}`,
            ),
          );
        });
      });
    });
  } finally {
    await unlink(tempPath).catch(() => {
      // ignore cleanup errors
    });
  }
}

async function insertNotebookWithSlugRetry(
  db: Db,
  title: string,
  ownerId: string,
  values: Omit<typeof notebooks.$inferInsert, "slug">,
): Promise<string> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = await uniqueSlug(title, ownerId, db);
    try {
      await db.insert(notebooks).values({ ...values, slug });
      return slug;
    } catch (err: unknown) {
      if (isPgUniqueViolation(err) && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to allocate unique notebook slug");
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<SuccessBody | ErrorBody>> {
  const uploadedKeys: string[] = [];

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Expected multipart/form-data",
        400,
      );
    }

    const form = await req.formData();

    const title = (getString(form, "title") || "").trim();
    if (!title) {
      return errorResponse("VALIDATION_ERROR", "Title is required", 400);
    }

    const descriptionRaw = getString(form, "description");
    const description =
      descriptionRaw && descriptionRaw.trim().length > 0
        ? descriptionRaw.trim()
        : null;

    const tagsRaw = getString(form, "tags") || "";
    const studyUrlRaw = getString(form, "studyUrl");
    const studyUrl =
      studyUrlRaw && studyUrlRaw.trim().length > 0 ? studyUrlRaw.trim() : null;
    const studyTitleRaw = getString(form, "studyTitle");
    const studyTitle =
      studyTitleRaw && studyTitleRaw.trim().length > 0
        ? studyTitleRaw.trim()
        : null;

    const file = getFile(form, "file");
    const githubUrlRaw = getString(form, "githubUrl");

    const hasFile = !!file;
    const hasGithub = !!(githubUrlRaw && githubUrlRaw.trim().length > 0);

    if (hasFile && hasGithub) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide either a .ipynb file or a GitHub URL, not both",
        400,
      );
    }
    if (!hasFile && !hasGithub) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide either a .ipynb file or a GitHub URL",
        400,
      );
    }

    let ipynbText: string;
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        return errorResponse("FILE_TOO_LARGE", "File too large", 400);
      }
      ipynbText = await file.text();
    } else {
      const githubUrl = githubUrlRaw!.trim();
      if (
        !githubUrl.startsWith("https://github.com/") &&
        !githubUrl.startsWith("https://raw.githubusercontent.com/")
      ) {
        return errorResponse(
          "VALIDATION_ERROR",
          "GitHub URL must be a github.com or raw.githubusercontent.com link",
          400,
        );
      }
      const rawUrl = toRawGithubUrl(githubUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let ghRes: Response;
      try {
        ghRes = await fetch(rawUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "callysto-notebooks/1.0" },
        });
      } catch {
        clearTimeout(timeout);
        return errorResponse(
          "FETCH_FAILED",
          "Failed to fetch notebook from GitHub",
          400,
        );
      }
      clearTimeout(timeout);

      if (!ghRes.ok) {
        return errorResponse(
          "FETCH_FAILED",
          `GitHub fetch failed with status ${ghRes.status}`,
          400,
        );
      }

      const buf = Buffer.from(await ghRes.arrayBuffer());
      if (buf.length > 10 * 1024 * 1024) {
        return errorResponse("FILE_TOO_LARGE", "File too large", 400);
      }
      ipynbText = buf.toString("utf8");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(ipynbText);
    } catch {
      return errorResponse("INVALID_FORMAT", "Invalid notebook format", 400);
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("nbformat" in (parsed as object)) ||
      typeof (parsed as { nbformat?: unknown }).nbformat !== "number"
    ) {
      return errorResponse("INVALID_FORMAT", "Invalid notebook format", 400);
    }

    const nb = parsed as {
      nbformat: number;
      cells?: unknown[];
      metadata?: {
        kernelspec?: { language?: string; name?: string };
        language_info?: { name?: string };
      };
    };

    const kernelLanguage =
      nb.metadata?.kernelspec?.language ||
      nb.metadata?.language_info?.name ||
      "python";
    const kernelName = nb.metadata?.kernelspec?.name ?? null;
    const cellCount = Array.isArray(nb.cells) ? nb.cells.length : 0;

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    const uniqueTags = Array.from(new Set(tags));

    const db = getDb();
    const ownerId = await resolveOwnerId(db);
    const notebookId = randomUUID();

    const ipynbKey = `notebooks/${ownerId}/${notebookId}/raw.ipynb`;
    const htmlKey = `notebooks/${ownerId}/${notebookId}/rendered.html`;

    let renderedHtml: string;
    try {
      renderedHtml = await renderNotebookToHtml(ipynbText, notebookId);
    } catch (err: unknown) {
      if (err instanceof NbconvertMissingError) {
        return errorResponse(
          "NBCONVERT_MISSING",
          "Rendering unavailable",
          500,
        );
      }
      console.error("[notebooks] nbconvert render failed", err);
      return errorResponse("RENDER_FAILED", "Failed to render notebook", 500);
    }

    try {
      await uploadToR2(ipynbKey, ipynbText, "application/json");
      uploadedKeys.push(ipynbKey);
    } catch (err) {
      console.error("[notebooks] R2 raw upload failed", err);
      return errorResponse("STORAGE_FAILED", "Failed to store notebook", 500);
    }

    try {
      await uploadToR2(htmlKey, renderedHtml, "text/html");
      uploadedKeys.push(htmlKey);
    } catch (err) {
      console.error("[notebooks] R2 html upload failed", err);
      await cleanupR2Keys(uploadedKeys);
      return errorResponse(
        "STORAGE_FAILED",
        "Failed to store rendered notebook",
        500,
      );
    }

    let slug: string;
    try {
      slug = await insertNotebookWithSlugRetry(db, title, ownerId, {
        id: notebookId,
        title,
        description,
        tags: uniqueTags,
        ownerId,
        parentNotebookId: null,
        studyUrl,
        studyTitle,
        ipynbPath: ipynbKey,
        htmlPath: htmlKey,
        kernelLanguage,
        kernelName,
        cellCount,
        status: "draft",
      });
    } catch (err) {
      console.error("[notebooks] DB insert failed", err);
      await cleanupR2Keys(uploadedKeys);
      return errorResponse(
        "DB_ERROR",
        "Failed to save notebook metadata",
        500,
      );
    }

    const previewUrl = `/@${PLACEHOLDER_USERNAME}/${slug}`;

    return NextResponse.json(
      { notebookId, slug, previewUrl } satisfies SuccessBody,
      { status: 201 },
    );
  } catch (err) {
    if (uploadedKeys.length > 0) {
      await cleanupR2Keys(uploadedKeys);
    }
    console.error("[notebooks] Unhandled POST error", err);
    return errorResponse("INTERNAL_ERROR", "Internal server error", 500);
  }
}
