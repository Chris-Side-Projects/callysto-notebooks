import { describe, expect, it, vi } from "vitest";
import { generateSlug, uniqueSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it("normalizes a notebook title into a lowercase kebab-case slug", () => {
    const slug = generateSlug(" Replicating Card & Krueger (1994)! ");

    expect(slug).toBe("replicating-card-krueger-1994");
  });

  it("returns notebook when the title has no slug-safe characters", () => {
    const slug = generateSlug(" !!! ");

    expect(slug).toBe("notebook");
  });

  it("truncates slugs to at most 60 characters without a trailing hyphen", () => {
    const slug = generateSlug(
      "A very long reproducibility notebook about minimum wage employment effects in restaurants",
    );

    expect(slug).toBe(
      "a-very-long-reproducibility-notebook-about-minimum-wage-empl",
    );
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when the owner has no existing notebook with that slug", async () => {
    const db = {
      query: {
        notebooks: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };

    const slug = await uniqueSlug(
      "Replicating Card & Krueger (1994)",
      "00000000-0000-0000-0000-000000000000",
      db as never,
    );

    expect(slug).toBe("replicating-card-krueger-1994");
    expect(db.query.notebooks.findFirst).toHaveBeenCalledTimes(1);
  });

  it("appends the first available numeric suffix when the base slug collides", async () => {
    const db = {
      query: {
        notebooks: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ id: "first-hit" })
            .mockResolvedValueOnce({ id: "second-hit" })
            .mockResolvedValueOnce(null),
        },
      },
    };

    const slug = await uniqueSlug(
      "Replicating Card & Krueger (1994)",
      "00000000-0000-0000-0000-000000000000",
      db as never,
    );

    expect(slug).toBe("replicating-card-krueger-1994-3");
    expect(db.query.notebooks.findFirst).toHaveBeenCalledTimes(3);
  });
});
