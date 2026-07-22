import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SubmitForm } from "@/components/SubmitForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("SubmitForm", () => {
  it("exports the client submit form component", () => {
    expect(SubmitForm).toBeTypeOf("function");
  });

  it("wires form submission to POST /api/notebooks and routes to the returned profile slug", () => {
    const source = readFileSync(
      join(process.cwd(), "components/SubmitForm.tsx"),
      "utf8",
    );

    expect(source).toContain('fetch("/api/notebooks", {');
    expect(source).toContain('method: "POST"');
    expect(source).toContain("body: formData");
    expect(source).toContain("router.push(`/@chris/${data.slug}`)");
  });

  it("expects the notebook submit API success body before navigating to the preview route", () => {
    const source = readFileSync(
      join(process.cwd(), "components/SubmitForm.tsx"),
      "utf8",
    );

    expect(source).toContain("interface SubmitSuccess");
    expect(source).toContain("notebookId: string;");
    expect(source).toContain("slug: string;");
    expect(source).toContain("previewUrl: string;");
    expect(source).toContain("const data = (await res.json()) as SubmitSuccess;");
    expect(source).toContain("router.push(`/@chris/${data.slug}`)");
  });

  it("uses the field names expected by the notebook submit API", () => {
    const source = readFileSync(
      join(process.cwd(), "components/SubmitForm.tsx"),
      "utf8",
    );

    expect(source).toContain('name="file"');
    expect(source).toContain('name="githubUrl"');
    expect(source).toContain('name="title"');
    expect(source).toContain('name="description"');
    expect(source).toContain('name="tags"');
    expect(source).toContain('name="studyUrl"');
    expect(source).toContain('name="studyTitle"');
  });
});
