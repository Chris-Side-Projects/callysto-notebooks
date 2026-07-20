import { expect, test } from "@playwright/test";

test("the demonstration homepage and canonical notebook route render", async ({
  page,
}) => {
  const homeResponse = await page.goto("/");
  expect(homeResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Publish the analysis",
  );
  await expect(
    page.getByText("Product demonstration", { exact: true }).first(),
  ).toBeVisible();

  const notebookResponse = await page.goto("/@demo/example-notebook");
  expect(notebookResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Example Notebook",
  );
  await expect(
    page.getByText("Product demonstration", { exact: true }),
  ).toBeVisible();
});

test("invalid notebook-route segments are rejected", async ({ request }) => {
  const missingHandle = await request.get("/demo/example-notebook");
  const emptyDerivedTitle = await request.get("/@demo/---");

  expect(missingHandle.status()).toBe(404);
  expect(emptyDerivedTitle.status()).toBe(404);
});
