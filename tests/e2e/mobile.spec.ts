import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 320, height: 720 }, isMobile: true });

test("mobile homepage exposes primary journeys", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /sample test/i }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
});

test("mobile job detail has sticky actions", async ({ page }) => {
  await page.goto("/jobs/demo-ssc-assistant-2026");
  await expect(page.getByRole("link", { name: "Check Eligibility" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Official Apply" })).toBeVisible();
});

test("mobile pricing explains the free tier and per-exam pricing", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Simple pricing, per exam" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free for everyone" })).toBeVisible();
});

test("primary CTAs navigate to functional destinations", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Create a free account" }).click();
  await expect(page).toHaveURL(/\/signup/);

  await page.goto("/tests");
  await expect(page.getByRole("heading", { name: "Mock test series for govt exams" })).toBeVisible();
});

test("forms and save actions complete their flows", async ({ page }) => {
  await page.goto("/eligibility");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/eligibility\?step=2/);
  await page.getByRole("button", { name: "Review profile" }).click();
  await expect(page).toHaveURL(/\/eligibility\?step=3/);
  await page.getByRole("button", { name: "View Matches" }).click();
  await expect(page).toHaveURL(/\/eligibility\/results/);

  await page.goto("/jobs/demo-ssc-assistant-2026");
  await page.getByRole("link", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/saved\?post=demo-ssc-assistant-2026$/);
  await expect(page.getByRole("heading", { name: "SSC Assistant Officer" })).toBeVisible();

  await page.goto("/report-error");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page).toHaveURL(/\/report-error\/thanks/);
  await expect(page.getByRole("heading", { name: "Report received" })).toBeVisible();
});
