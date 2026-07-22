import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteFromR2: vi.fn(),
  getDb: vi.fn(),
  insertValues: vi.fn(),
  randomUUID: vi.fn(),
  spawn: vi.fn(),
  uniqueSlug: vi.fn(),
  uploadToR2: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/r2", () => ({
  deleteFromR2: mocks.deleteFromR2,
  uploadToR2: mocks.uploadToR2,
}));

vi.mock("@/lib/slug", () => ({
  uniqueSlug: mocks.uniqueSlug,
}));

vi.mock("child_process", () => ({
  spawn: mocks.spawn,
}));

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    ...actual,
    randomUUID: mocks.randomUUID,
  };
});

const { POST } = await import("@/app/api/notebooks/route");

const OWNER_ID = "00000000-0000-0000-0000-000000000000";
const NOTEBOOK_ID = "11111111-1111-4111-8111-111111111111";
const SLUG = "replicating-card-krueger-1994";
const RAW_KEY = `notebooks/${OWNER_ID}/${NOTEBOOK_ID}/raw.ipynb`;
const HTML_KEY = `notebooks/${OWNER_ID}/${NOTEBOOK_ID}/rendered.html`;

const notebook = {
  cells: [
    {
      cell_type: "markdown",
      metadata: {},
      source: ["# Hello"],
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: ["print('hello')"],
    },
  ],
  metadata: {
    kernelspec: {
      display_name: "Python 3",
      language: "python",
      name: "python3",
    },
    language_info: {
      name: "python",
    },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

const notebookText = JSON.stringify(notebook);

function mockSuccessfulNbconvert(html: string) {
  mocks.spawn.mockImplementation(() => {
    const child = new EventEmitter() as EventEmitter & {
      kill: ReturnType<typeof vi.fn>;
      stderr: EventEmitter;
      stdout: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = vi.fn();

    process.nextTick(() => {
      child.stdout.emit("data", Buffer.from(html));
      child.emit("close", 0);
    });

    return child;
  });
}

function makeDb() {
  return {
    insert: vi.fn(() => ({
      values: mocks.insertValues,
    })),
    query: {
      users: {
        findFirst: mocks.userFindFirst,
      },
    },
  };
}

function makeForm(overrides: { file?: File | null; githubUrl?: string } = {}) {
  const form = new FormData();
  form.set("title", "Replicating Card & Krueger (1994)");
  form.set(
    "description",
    "A replication notebook for the minimum wage employment analysis.",
  );
  form.set("tags", "Economics, Replication, economics, diff-in-diff");
  form.set("studyUrl", "https://www.aeaweb.org/articles?id=10.1257/aer.84.4.772");
  form.set(
    "studyTitle",
    "Minimum Wages and Employment: A Case Study of the Fast-Food Industry",
  );

  if (overrides.file !== null) {
    form.set(
      "file",
      overrides.file ??
        new File([notebookText], "card-krueger.ipynb", {
          type: "application/json",
        }),
    );
  }

  if (overrides.githubUrl) {
    form.set("githubUrl", overrides.githubUrl);
  }

  return form;
}

function makeMinimalNotebookForm() {
  const form = new FormData();
  form.set("title", "Notebook Without Metadata");
  form.set(
    "file",
    new File(
      [
        JSON.stringify({
          cells: "not-an-array",
          metadata: {},
          nbformat: 4,
          nbformat_minor: 5,
        }),
      ],
      "no-metadata.ipynb",
      {
        type: "application/json",
      },
    ),
  );
  return form;
}

function makeRequest(form: FormData) {
  return new Request("http://localhost/api/notebooks", {
    body: form,
    method: "POST",
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());

  mocks.randomUUID.mockReturnValue(NOTEBOOK_ID);
  mocks.uniqueSlug.mockResolvedValue(SLUG);
  mocks.userFindFirst.mockResolvedValue({ id: OWNER_ID });
  mocks.insertValues.mockResolvedValue(undefined);
  mocks.uploadToR2.mockResolvedValue(undefined);
  mocks.deleteFromR2.mockResolvedValue(undefined);
  mocks.getDb.mockReturnValue(makeDb());
  mockSuccessfulNbconvert("<html><body><h1>Hello</h1></body></html>");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/notebooks", () => {
  it("returns 201 with the notebook id, slug, and profile preview URL for a valid file upload", async () => {
    const response = await POST(makeRequest(makeForm()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      notebookId: NOTEBOOK_ID,
      slug: SLUG,
      previewUrl: `/@chris/${SLUG}`,
    });
    expect(body.notebookId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(body.slug.length).toBeLessThanOrEqual(60);
  });

  it("succeeds when the request contains only an uploaded notebook file", async () => {
    const response = await POST(makeRequest(makeForm()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      notebookId: NOTEBOOK_ID,
      slug: SLUG,
      previewUrl: `/@chris/${SLUG}`,
    });
    expect(mocks.uploadToR2).toHaveBeenCalledTimes(2);
    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
  });

  it("stores raw notebook JSON and rendered HTML in R2 with exact keys and content types", async () => {
    await POST(makeRequest(makeForm()));

    expect(mocks.uploadToR2).toHaveBeenNthCalledWith(
      1,
      RAW_KEY,
      notebookText,
      "application/json",
    );
    expect(mocks.uploadToR2).toHaveBeenNthCalledWith(
      2,
      HTML_KEY,
      "<html><body><h1>Hello</h1></body></html>",
      "text/html",
    );
  });

  it("inserts one draft notebook row with normalized metadata and storage paths", async () => {
    await POST(makeRequest(makeForm()));

    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    expect(mocks.insertValues).toHaveBeenCalledWith({
      cellCount: 2,
      description:
        "A replication notebook for the minimum wage employment analysis.",
      htmlPath: HTML_KEY,
      id: NOTEBOOK_ID,
      ipynbPath: RAW_KEY,
      kernelLanguage: "python",
      kernelName: "python3",
      ownerId: OWNER_ID,
      parentNotebookId: null,
      slug: SLUG,
      status: "draft",
      studyTitle:
        "Minimum Wages and Employment: A Case Study of the Fast-Food Industry",
      studyUrl: "https://www.aeaweb.org/articles?id=10.1257/aer.84.4.772",
      tags: ["economics", "replication", "diff-in-diff"],
      title: "Replicating Card & Krueger (1994)",
    });
  });

  it("inserts null optional fields and default notebook metadata when they are omitted", async () => {
    await POST(makeRequest(makeMinimalNotebookForm()));

    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    expect(mocks.insertValues).toHaveBeenCalledWith({
      cellCount: 0,
      description: null,
      htmlPath: HTML_KEY,
      id: NOTEBOOK_ID,
      ipynbPath: RAW_KEY,
      kernelLanguage: "python",
      kernelName: null,
      ownerId: OWNER_ID,
      parentNotebookId: null,
      slug: SLUG,
      status: "draft",
      studyTitle: null,
      studyUrl: null,
      tags: [],
      title: "Notebook Without Metadata",
    });
  });

  it("fetches a valid GitHub blob URL as raw content and returns the same success shape", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(notebookText, {
        status: 200,
      }),
    );

    const response = await POST(
      makeRequest(
        makeForm({
          file: null,
          githubUrl:
            "https://github.com/chris/research/blob/main/notebooks/analysis.ipynb",
        }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      notebookId: NOTEBOOK_ID,
      slug: SLUG,
      previewUrl: `/@chris/${SLUG}`,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/chris/research/main/notebooks/analysis.ipynb",
      {
        headers: { "User-Agent": "callysto-notebooks/1.0" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("succeeds when the request contains only a GitHub notebook URL", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(notebookText, {
        status: 200,
      }),
    );

    const response = await POST(
      makeRequest(
        makeForm({
          file: null,
          githubUrl:
            "https://raw.githubusercontent.com/chris/research/main/notebooks/analysis.ipynb",
        }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      notebookId: NOTEBOOK_ID,
      slug: SLUG,
      previewUrl: `/@chris/${SLUG}`,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/chris/research/main/notebooks/analysis.ipynb",
      {
        headers: { "User-Agent": "callysto-notebooks/1.0" },
        signal: expect.any(AbortSignal),
      },
    );
    expect(mocks.uploadToR2).toHaveBeenCalledTimes(2);
    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
  });

  it("requires exactly one notebook source", async () => {
    const neitherResponse = await POST(makeRequest(makeForm({ file: null })));
    const neitherBody = await neitherResponse.json();

    expect(neitherResponse.status).toBe(400);
    expect(neitherBody).toEqual({
      code: "VALIDATION_ERROR",
      error: "Provide either a .ipynb file or a GitHub URL",
    });

    const bothResponse = await POST(
      makeRequest(
        makeForm({
          githubUrl:
            "https://github.com/chris/research/blob/main/notebooks/analysis.ipynb",
        }),
      ),
    );
    const bothBody = await bothResponse.json();

    expect(bothResponse.status).toBe(400);
    expect(bothBody).toEqual({
      code: "VALIDATION_ERROR",
      error: "Provide either a .ipynb file or a GitHub URL, not both",
    });
  });

  it("invokes nbconvert through spawn without shell execution", async () => {
    await POST(makeRequest(makeForm()));

    expect(mocks.spawn).toHaveBeenCalledWith(
      "python3",
      ["-m", "nbconvert", "--to", "html", "--stdout", expect.any(String)],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const routeSource = readFileSync(
      join(process.cwd(), "app/api/notebooks/route.ts"),
      "utf8",
    );
    expect(routeSource).toContain('import { spawn } from "child_process";');
    expect(routeSource).not.toContain('import { exec } from "child_process";');
    expect(routeSource).not.toContain("exec(");
  });
});
