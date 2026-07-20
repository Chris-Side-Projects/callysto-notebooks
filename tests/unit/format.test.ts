import { describe, expect, it } from "vitest";

import { formatCount, formatRelativeTime } from "../../lib/format";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1_000, "1k"],
    [1_250, "1.3k"],
    [10_400, "10k"],
    [1_500_000, "1.5M"],
  ])("formats %i as %s", (value, expected) => {
    expect(formatCount(value)).toBe(expected);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it.each([
    ["2026-07-20T11:59:40.000Z", "just now"],
    ["2026-07-20T11:55:00.000Z", "5m ago"],
    ["2026-07-20T09:00:00.000Z", "3h ago"],
    ["2026-07-17T12:00:00.000Z", "3d ago"],
    ["2025-07-20T12:00:00.000Z", "1y ago"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatRelativeTime(value, now)).toBe(expected);
  });
});
