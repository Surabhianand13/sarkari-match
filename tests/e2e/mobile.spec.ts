import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 320, height: 720 }, isMobile: true });

test("mobile homepage exposes primary journeys", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Find govt job and exam notifications you are eligible for/ })).toBeVisible();
  await expect(page.getByText("Founding Offer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Find My Matches" }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
});

test("mobile job detail has sticky actions", async ({ page }) => {
  await page.goto("/jobs/demo-ssc-assistant-2026");
  await expect(page.getByRole("link", { name: "Check Eligibility" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Official Apply" })).toBeVisible();
});

test("mobile pricing highlights founding pass", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Simple plans for serious notification matching" })).toBeVisible();
  await expect(page.getByText("Founding Pro Pass")).toBeVisible();
  await expect(page.getByText("₹49 once")).toBeVisible();
});

test("primary CTAs navigate to functional destinations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Claim Offer/ }).click();
  await expect(page).toHaveURL(/\/pricing$/);

  await page.getByRole("link", { name: /Claim Founding Pass/ }).first().click();
  await expect(page).toHaveURL(/\/checkout\/founding$/);
  await expect(page.getByRole("heading", { name: "Founding Pro Pass" })).toBeVisible();

  await page.getByRole("link", { name: "View billing" }).click();
  await expect(page).toHaveURL(/\/dashboard\/billing$/);
  await expect(page.getByRole("heading", { name: "Free demo workspace" })).toBeVisible();
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
