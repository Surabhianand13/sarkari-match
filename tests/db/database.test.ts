import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

const root = process.cwd();

async function run(dir: string) {
  const { getDb } = await import("@/lib/db");
  const db = (await getDb())!;
  for (const file of readdirSync(join(root, dir)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(root, dir, file), "utf8"));
  }
}

beforeAll(async () => {
  await run("db/migrations");
  await run("db/seed");
});

describe("baseline schema and seeds", () => {
  it("creates users with a case-insensitive unique email", async () => {
    const { createUser } = await import("@/lib/auth/users");
    const first = await createUser({ email: "Dup@Example.com", passwordHash: "x" });
    expect(first?.email).toBe("dup@example.com");
    await expect(createUser({ email: "dup@example.com", passwordHash: "y" })).rejects.toThrow();
  });

  it("returns only published notifications with their rules", async () => {
    const { getJobs, getJobWithRulesBySlug } = await import("@/lib/data/jobs");
    const jobs = await getJobs();
    expect(jobs.map((job) => job.slug).sort()).toEqual(["demo-railway-technician-2026", "demo-ssc-assistant-2026", "demo-upsc-civil-services-2026"]);
    const found = await getJobWithRulesBySlug("demo-ssc-assistant-2026");
    expect(found?.job.state).toBe("Central Government");
    expect(found?.rules.ageRules[0].maximumAge).toBe(27);
    expect(await getJobWithRulesBySlug("missing")).toBeUndefined();
  });

  it("hides unpublished recruitments from public reads", async () => {
    const { getDb } = await import("@/lib/db");
    const { getJobs } = await import("@/lib/data/jobs");
    const db = (await getDb())!;
    await db.query("update recruitments set editorial_status = 'draft' where slug = 'demo-ssc-assistant-2026'");
    expect((await getJobs()).map((job) => job.slug)).not.toContain("demo-ssc-assistant-2026");
    await db.query("update recruitments set editorial_status = 'published' where slug = 'demo-ssc-assistant-2026'");
  });
});

describe("test platform schema", () => {
  it("applies and enforces question constraints", async () => {
    const { getDb } = await import("@/lib/db");
    const db = (await getDb())!;
    await db.query("insert into exams (slug, name) values ('ssc-cgl', 'SSC CGL')");
    const insert = (hash: string, status: string, answer = "B") =>
      db.query(
        `insert into questions (subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash)
         values ('Quant', 'Percentage', 'moderate', 'stem', '{"A":"a","B":"b","C":"c","D":"d"}', $3, 'because', $2, $1)`,
        [hash, status, answer]
      );
    await insert("h1", "pending");
    await expect(insert("h1", "pending")).rejects.toThrow();
    await expect(insert("h2", "published-ish")).rejects.toThrow();
    await expect(insert("h3", "pending", "E")).rejects.toThrow();
  });
});

describe("rate limiting", () => {
  it("allows up to the limit then blocks within the window", async () => {
    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await checkRateLimit("test:key", 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(await checkRateLimit("other:key", 3, 60)).toBe(true);
  });
});

describe("otp storage", () => {
  it("accepts the latest code once, counts wrong attempts and locks out", async () => {
    const { storeOtp, verifyOtp } = await import("@/lib/auth/otp");
    await storeOtp("o@example.com", "111111");
    await storeOtp("o@example.com", "222222");
    expect(await verifyOtp("o@example.com", "111111")).toBe("invalid");
    expect(await verifyOtp("o@example.com", "222222")).toBe("ok");
    expect(await verifyOtp("o@example.com", "222222")).toBe("invalid");

    await storeOtp("lock@example.com", "333333");
    for (let i = 0; i < 5; i++) expect(await verifyOtp("lock@example.com", "000000")).toBe("invalid");
    expect(await verifyOtp("lock@example.com", "333333")).toBe("too_many_attempts");
  });
});

describe("match persistence", () => {
  it("writes the profile, qualifications and match results for a user", async () => {
    const { createUser } = await import("@/lib/auth/users");
    const { getDb } = await import("@/lib/db");
    const { getJobsForMatching } = await import("@/lib/data/jobs");
    const { evaluateMatch } = await import("@/lib/matching/engine");
    const { deriveCandidateProfile } = await import("@/lib/matching/profile");
    const { persistCandidateMatches } = await import("@/lib/matching/persist");

    const user = (await createUser({ email: "m@example.com", passwordHash: "x" }))!;
    const profile = deriveCandidateProfile({ dateOfBirth: "2000-01-01", category: "General", qualification: "Graduate", state: "Karnataka" });
    const results = (await getJobsForMatching()).map(({ job, rules }) => ({ job, result: evaluateMatch(profile, rules) }));
    await persistCandidateMatches(user.id, profile, results);
    await persistCandidateMatches(user.id, profile, results);

    const db = (await getDb())!;
    expect((await db.query("select 1 from candidate_profiles where user_id = $1", [user.id])).rowCount).toBe(1);
    expect((await db.query("select 1 from user_qualifications where user_id = $1", [user.id])).rowCount).toBe(1);
    expect((await db.query("select 1 from match_results where user_id = $1", [user.id])).rowCount).toBe(3);
  });
});
