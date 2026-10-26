import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";
process.env.ACCESS_GRANT_SECRET = "test-grant-secret-with-more-than-24-chars";

const ids = { learner: "", other: "", cgl: "", upsc: "", cglSeries: "", upscSeries: "", cglSeries2: "" };

async function db() {
  const { getDb } = await import("@/lib/db");
  return (await getDb())!;
}

describe("exam offers", () => {
  beforeAll(async () => {
    const conn = await db();
    const { createUser } = await import("@/lib/auth/users");
    for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
    ids.learner = (await createUser({ email: "learner@example.com", passwordHash: "x" }))!.id;
    ids.other = (await createUser({ email: "other@example.com", passwordHash: "x" }))!.id;
    ids.cgl = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
    ids.upsc = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('upsc-cse','UPSC CSE') returning id")).rows[0].id;
    const series = async (exam: string, slug: string, price: number) => (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,$2,$2,$3,'published', now()) returning id", [exam, slug, price])).rows[0].id;
    ids.cglSeries = await series(ids.cgl, "cgl-main", 99900);
    ids.cglSeries2 = await series(ids.cgl, "cgl-extra", 49900);
    ids.upscSeries = await series(ids.upsc, "upsc-main", 249900);
    await conn.query("insert into exam_offers (exam_id, pass_validity_days, guide_enabled, guide_price_paise, guide_mrp_paise, ai_daily_fast_cap, ai_daily_deep_cap) values ($1, 365, true, 199900, 299900, 2, 1)", [ids.cgl]);
    await conn.query("insert into exam_offers (exam_id, pass_validity_days, second_exam_discount_percent) values ($1, 100, 25)", [ids.upsc]);
  });

  it("rounds a discounted price to whole rupees", async () => {
    const { discountedPrice } = await import("@/lib/offers");
    expect(discountedPrice(99900, 20)).toBe(79900);
    expect(discountedPrice(249900, 25)).toBe(187400);
    expect(discountedPrice(99900, 0)).toBe(99900);
  });

  it("uses defaults when an exam has no offer row", async () => {
    const { getExamOffer } = await import("@/lib/offers");
    const conn = await db();
    const bare = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('bare','Bare') returning id")).rows[0].id;
    const offer = await getExamOffer(bare);
    expect(offer).toMatchObject({ passValidityDays: 365, secondExamDiscountPercent: 20, guideEnabled: false, aiDailyFastCap: 30, aiDailyDeepCap: 2 });
  });

  it("gives the second-exam discount only after a purchased Pass for a different exam", async () => {
    const { passQuote, grantPass } = await import("@/lib/offers");
    const conn = await db();
    expect((await passQuote(ids.learner, ids.upscSeries))!.payablePaise).toBe(249900);
    expect((await passQuote(null, ids.upscSeries))!.discountPercent).toBe(0);

    await grantPass(conn, { userId: ids.learner, seriesId: ids.cglSeries, source: "grant" });
    expect((await passQuote(ids.learner, ids.upscSeries))!.discountPercent).toBe(0); // a manual grant is not a purchase

    await grantPass(conn, { userId: ids.learner, seriesId: ids.cglSeries2, source: "purchase", paymentRef: "pay_second_series" });
    expect((await passQuote(ids.learner, ids.cglSeries))!.discountPercent).toBe(0); // same exam: no discount
    const quote = (await passQuote(ids.learner, ids.upscSeries))!;
    expect(quote).toMatchObject({ discountPercent: 25, payablePaise: 187400, reason: "second_exam", examSlug: "upsc-cse" });
    expect((await passQuote(ids.other, ids.upscSeries))!.discountPercent).toBe(0);
  });

  it("ends a granted Pass after the exam's validity and is idempotent on the payment reference", async () => {
    const { grantPass } = await import("@/lib/offers");
    const conn = await db();
    const first = await grantPass(conn, { userId: ids.other, seriesId: ids.upscSeries, source: "purchase", paymentRef: "pay_upsc_1" });
    const days = (new Date(first.expiresAt).getTime() - Date.now()) / 86400000;
    expect(first.granted).toBe(true);
    expect(days).toBeGreaterThan(99);
    expect(days).toBeLessThan(101);
    expect((await grantPass(conn, { userId: ids.other, seriesId: ids.upscSeries, source: "purchase", paymentRef: "pay_upsc_1" })).granted).toBe(false);
  });

  it("sells the Guide only with a Pass for the same exam, once", async () => {
    const { getGuideStatus, grantGuide } = await import("@/lib/offers");
    const conn = await db();
    const noPass = await getGuideStatus(ids.other, ids.cgl);
    expect(noPass).toMatchObject({ enabled: true, hasPass: false, canBuy: false, owned: false });
    expect((await getGuideStatus(ids.other, ids.upsc)).enabled).toBe(false);
    const withPass = await getGuideStatus(ids.learner, ids.cgl);
    expect(withPass).toMatchObject({ hasPass: true, canBuy: true, pricePaise: 199900 });

    expect((await grantGuide(conn, { userId: ids.learner, examId: ids.cgl, source: "purchase", paymentRef: "pay_guide_1" })).granted).toBe(true);
    expect((await grantGuide(conn, { userId: ids.learner, examId: ids.cgl, source: "purchase", paymentRef: "pay_guide_1" })).granted).toBe(false);
    expect((await grantGuide(conn, { userId: ids.learner, examId: ids.cgl, source: "grant" })).granted).toBe(false);
    expect(await getGuideStatus(ids.learner, ids.cgl)).toMatchObject({ owned: true, canBuy: false });
  });

  it("enforces access and daily caps, records usage, and keeps history", async () => {
    const { sendGuideMessage, getGuideHistory } = await import("@/lib/guide/service");
    const conn = await db();
    const calls: Array<{ model: string; system: string; tier: string }> = [];
    const provider = async (request: { model: string; system: Array<{ text: string }>; messages: Array<{ content: string }> }) => {
      calls.push({ model: request.model, system: request.system.map((block) => block.text).join("\n"), tier: request.model });
      return { text: `answer ${calls.length}`, inputTokens: 1000, outputTokens: 100 };
    };

    expect((await sendGuideMessage({ userId: ids.other, examSlug: "ssc-cgl", text: "hi", deep: false, provider })).ok).toBe(false);
    const first = await sendGuideMessage({ userId: ids.learner, examSlug: "ssc-cgl", text: "What should I study?", deep: false, provider });
    expect(first).toMatchObject({ ok: true, reply: "answer 1", left: { fast: 1, deep: 1 } });
    expect(calls[0].system).toContain("SSC CGL");
    expect(calls[0].system).toContain("Learner results for SSC CGL");

    await sendGuideMessage({ userId: ids.learner, examSlug: "ssc-cgl", text: "again", deep: false, provider });
    const capped = await sendGuideMessage({ userId: ids.learner, examSlug: "ssc-cgl", text: "one more", deep: false, provider });
    expect(capped).toMatchObject({ ok: false, reason: "cap_fast" });
    expect(calls).toHaveLength(2);

    const deep = await sendGuideMessage({ userId: ids.learner, examSlug: "ssc-cgl", text: "explain deeper", deep: true, provider });
    expect(deep.ok).toBe(true);
    expect(calls[2].model).toBe("claude-sonnet-5-5");
    expect(await sendGuideMessage({ userId: ids.learner, examSlug: "ssc-cgl", text: "deeper again", deep: true, provider })).toMatchObject({ ok: false, reason: "cap_deep" });

    const usage = await conn.query<{ tier: string; turns: number; input_tokens: string; output_tokens: string }>("select tier, turns, input_tokens, output_tokens from ai_usage where user_id = $1 order by tier", [ids.learner]);
    expect(usage.rows.map((row) => [row.tier, Number(row.turns), Number(row.input_tokens), Number(row.output_tokens)])).toEqual([["deep", 1, 1000, 100], ["fast", 2, 2000, 200]]);
    expect((await getGuideHistory(ids.learner, ids.cgl)).map((message) => message.role)).toEqual(["user", "assistant", "user", "assistant", "user", "assistant"]);
  });

  it("does not spend a turn when the provider fails or is missing", async () => {
    const { sendGuideMessage } = await import("@/lib/guide/service");
    const { createUser } = await import("@/lib/auth/users");
    const { grantGuide } = await import("@/lib/offers");
    const conn = await db();
    const user = (await createUser({ email: "fresh@example.com", passwordHash: "x" }))!.id;
    await grantGuide(conn, { userId: user, examId: ids.cgl, source: "grant" });
    expect(await sendGuideMessage({ userId: user, examSlug: "ssc-cgl", text: "hello", deep: false, provider: async () => { throw new Error("boom"); } })).toMatchObject({ ok: false, reason: "error", left: { fast: 2, deep: 1 } });
    expect(await sendGuideMessage({ userId: user, examSlug: "ssc-cgl", text: "hello", deep: false, provider: null })).toMatchObject({ ok: false, reason: "unavailable" });
    const used = await conn.query("select 1 from ai_usage where user_id = $1", [user]);
    expect(used.rows).toHaveLength(0);
  });

  it("checks the quoted amount and grants a Guide through the payment API, idempotently", async () => {
    const { signCheckoutRef } = await import("@/lib/tests/checkout-ref");
    const { POST } = await import("@/app/api/internal/grant-access/route");
    const { createUser } = await import("@/lib/auth/users");
    const buyer = (await createUser({ email: "buyer@example.com", passwordHash: "x" }))!.id;
    const call = (body: unknown, secret = process.env.ACCESS_GRANT_SECRET) =>
      POST(new Request("http://localhost/api/internal/grant-access", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify(body) }));

    const ref = await signCheckoutRef({ userId: buyer, product: "guide", targetId: ids.cgl, amountPaise: 199900 });
    expect((await call({ paymentRef: "pay_api_1", ref }, "wrong-secret-wrong-secret-wrong")).status).toBe(401);
    expect((await call({ paymentRef: "pay_api_1", ref, amountPaise: 100 })).status).toBe(400);
    const ok = await call({ paymentRef: "pay_api_1", ref, amountPaise: 199900 });
    expect(await ok.json()).toMatchObject({ ok: true, product: "guide", granted: true });
    expect(await (await call({ paymentRef: "pay_api_1", ref, amountPaise: 199900 })).json()).toMatchObject({ granted: false });

    const pass = await call({ paymentRef: "pay_api_2", email: "buyer@example.com", product: "pass", seriesSlug: "upsc-main" });
    expect(await pass.json()).toMatchObject({ ok: true, product: "pass", granted: true });
  });

  it("reads each exam's own pattern, with SSC CGL's built in until set", async () => {
    const { getExamPattern } = await import("@/lib/exams/pattern");
    const conn = await db();
    expect((await getExamPattern("ssc-cgl"))?.questions).toBe(100);
    expect(await getExamPattern("upsc-cse")).toBeNull();
    const pattern = { name: "UPSC CSE Prelims", questions: 100, maxMarks: 200, minutes: 120, marksPerQuestion: 2, negativeMarks: 0.67, sections: [{ name: "General Studies", questions: 100, marks: 200 }] };
    await conn.query("update exams set pattern = $2 where id = $1", [ids.upsc, JSON.stringify(pattern)]);
    expect(await getExamPattern("upsc-cse")).toEqual(pattern);
  });

  it("grants a Pass and the Guide together for a bundle payment, once", async () => {
    const { signCheckoutRef } = await import("@/lib/tests/checkout-ref");
    const { POST } = await import("@/app/api/internal/grant-access/route");
    const { createUser } = await import("@/lib/auth/users");
    const { getGuideStatus, hasPassForExam } = await import("@/lib/offers");
    const buyer = (await createUser({ email: "bundle-buyer@example.com", passwordHash: "x" }))!.id;
    const call = (body: unknown) => POST(new Request("http://localhost/api/internal/grant-access", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.ACCESS_GRANT_SECRET}` }, body: JSON.stringify(body) }));

    const ref = await signCheckoutRef({ userId: buyer, product: "bundle", targetId: ids.cglSeries, amountPaise: 99900 + 199900 });
    expect((await call({ paymentRef: "pay_bundle_1", ref, amountPaise: 99900 })).status).toBe(400); // only the Pass amount paid
    expect(await (await call({ paymentRef: "pay_bundle_1", ref, amountPaise: 299800 })).json()).toMatchObject({ ok: true, product: "bundle", granted: true });
    expect(await hasPassForExam(buyer, ids.cgl)).toBe(true);
    expect(await getGuideStatus(buyer, ids.cgl)).toMatchObject({ owned: true });
    expect(await (await call({ paymentRef: "pay_bundle_1", ref, amountPaise: 299800 })).json()).toMatchObject({ granted: false });
  });
});
