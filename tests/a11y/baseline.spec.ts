import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/@demo/example-notebook", "/submit", "/login"]) {
  test(`${path} has no serious or critical automated accessibility findings`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );
    expect(blocking).toEqual([]);
  });
}
