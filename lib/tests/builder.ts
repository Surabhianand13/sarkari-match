import { getDb, type Db } from "@/lib/db";

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type TestLevel = (typeof LEVELS)[number];
export type TestKind = "full" | "sectional" | "topic";
export type Mix = { easy: number; moderate: number; hard: number };
type Difficulty = keyof Mix;

// Difficulty mix of each level, in percent. Beginner tests are mostly easy, advanced tests mostly moderate and hard.
export const LEVEL_MIX: Record<TestLevel, Mix> = {
  beginner: { easy: 60, moderate: 35, hard: 5 },
  intermediate: { easy: 25, moderate: 55, hard: 20 },
  advanced: { easy: 10, moderate: 45, hard: 45 }
};

// sets: the section is built from whole data sets (a table or chart with its questions), which stay together and in order.
export type BuildSection = { name: string; subject: string; questions: number; topic?: string | null; sets?: boolean };

export type BuildInput = {
  seriesId: string;
  kind: TestKind;
  level: TestLevel;
  count: number;
  titlePrefix: string;
  durationMinutes: number;
  defaultMarks: number;
  negativeMarks: number;
  sections: BuildSection[];
  mix?: Mix;
  // The most tests any single question may appear in. 1 means every question is used at most once.
  maxReuse: number;
  status: "draft" | "published";
  seed?: number;
};

// For a data set, id is the set and members are its questions in order.
export type Candidate = { id: string; topic: string; difficulty: Difficulty; used: number; members?: string[] };
export type SectionPlan = { section: BuildSection; questionIds: string[] };
export type TestPlan = { sections: SectionPlan[] };
export type Availability = { section: string; easy: number; moderate: number; hard: number; total: number };
export type Plan = { tests: TestPlan[]; shortages: string[]; availability: Availability[] };

// Small seeded generator so a preview and the real build agree and tests are repeatable.
function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Splits `total` questions across difficulties by the mix, using the largest-remainder method so the parts always sum to `total`.
export function splitByMix(total: number, mix: Mix): Record<Difficulty, number> {
  const sum = mix.easy + mix.moderate + mix.hard || 1;
  const raw = (["easy", "moderate", "hard"] as const).map((key) => ({ key, exact: (total * mix[key]) / sum }));
  const result = { easy: 0, moderate: 0, hard: 0 } as Record<Difficulty, number>;
  for (const item of raw) result[item.key] = Math.floor(item.exact);
  let left = total - raw.reduce((acc, item) => acc + result[item.key], 0);
  for (const item of [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left <= 0) break;
    result[item.key] += 1;
    left -= 1;
  }
  return result;
}

const nearest: Record<Difficulty, Difficulty[]> = { easy: ["moderate", "hard"], moderate: ["easy", "hard"], hard: ["moderate", "easy"] };

// Pure planner: no database. Questions rotate through a shuffled list, least used first, so every question is used once before any
// is reused, and a question never appears twice in one test or more than `maxReuse` times overall.
export function planTests(pools: Candidate[][], input: BuildInput): Plan {
  const random = rng(input.seed ?? 1);
  const mix = input.mix ?? LEVEL_MIX[input.level];
  const state = pools.map((pool) => {
    const byDifficulty: Record<Difficulty, Candidate[]> = { easy: [], moderate: [], hard: [] };
    for (const candidate of pool) byDifficulty[candidate.difficulty].push({ ...candidate });
    for (const key of ["easy", "moderate", "hard"] as const) {
      shuffle(byDifficulty[key], random);
      byDifficulty[key].sort((a, b) => a.used - b.used);
    }
    return { byDifficulty, pointer: { easy: 0, moderate: 0, hard: 0 } as Record<Difficulty, number> };
  });
  const size = (list: Candidate[]) => list.reduce((sum, item) => sum + (item.members?.length ?? 1), 0);
  const availability: Availability[] = input.sections.map((section, i) => ({
    section: section.sets ? `${section.name} (data sets)` : section.name,
    easy: size(state[i].byDifficulty.easy),
    moderate: size(state[i].byDifficulty.moderate),
    hard: size(state[i].byDifficulty.hard),
    total: size(pools[i])
  }));

  // Data sets stay whole: pick sets, least used first, until the section's question count is reached exactly.
  const takeSets = (sectionIndex: number, wantedQuestions: number, inTest: Set<string>): Candidate[] | null => {
    const all = (["easy", "moderate", "hard"] as const).flatMap((key) => state[sectionIndex].byDifficulty[key]);
    const ordered = shuffle([...all], random).sort((a, b) => a.used - b.used);
    const chosen: Candidate[] = [];
    let left = wantedQuestions;
    for (const candidate of ordered) {
      const count = candidate.members?.length ?? 0;
      if (left <= 0) break;
      if (!count || count > left || candidate.used >= input.maxReuse || inTest.has(candidate.id)) continue;
      chosen.push(candidate);
      left -= count;
    }
    if (left !== 0) return null;
    for (const candidate of chosen) {
      candidate.used += 1;
      inTest.add(candidate.id);
    }
    return chosen;
  };

  const take = (sectionIndex: number, difficulty: Difficulty, inTest: Set<string>): Candidate | null => {
    const list = state[sectionIndex].byDifficulty[difficulty];
    if (!list.length) return null;
    let steps = 0;
    while (steps < list.length) {
      const index = state[sectionIndex].pointer[difficulty] % list.length;
      state[sectionIndex].pointer[difficulty] += 1;
      steps += 1;
      const candidate = list[index];
      if (candidate.used >= input.maxReuse || inTest.has(candidate.id)) continue;
      candidate.used += 1;
      inTest.add(candidate.id);
      return candidate;
    }
    return null;
  };

  const tests: TestPlan[] = [];
  const shortages = new Set<string>();
  for (let t = 0; t < input.count; t++) {
    const sections: SectionPlan[] = [];
    let complete = true;
    // Roll back usage if this test turns out short, so a failed test does not eat questions.
    const taken: Candidate[] = [];
    for (const [i, section] of input.sections.entries()) {
      const inTest = new Set<string>();
      if (section.sets) {
        const chosen = takeSets(i, section.questions, inTest);
        if (!chosen) {
          shortages.add(`${section.name}: could not fill ${section.questions} questions from whole data sets (test ${t + 1} of ${input.count}). Add more published sets, or change the number of questions.`);
          complete = false;
          sections.push({ section, questionIds: [] });
          continue;
        }
        taken.push(...chosen);
        sections.push({ section, questionIds: shuffle(chosen, random).flatMap((candidate) => candidate.members ?? []) });
        continue;
      }
      const wanted = splitByMix(section.questions, mix);
      const ids: string[] = [];
      for (const difficulty of ["easy", "moderate", "hard"] as const) {
        for (let k = 0; k < wanted[difficulty]; k++) {
          let pick = take(i, difficulty, inTest);
          for (const other of nearest[difficulty]) {
            if (pick) break;
            pick = take(i, other, inTest);
          }
          if (!pick) {
            shortages.add(`${section.name}: not enough unused ${difficulty} questions (needed for test ${t + 1} of ${input.count}).`);
            complete = false;
            continue;
          }
          taken.push(pick);
          ids.push(pick.id);
        }
      }
      shuffle(ids, random);
      sections.push({ section, questionIds: ids });
    }
    if (!complete) {
      for (const item of taken) item.used -= 1;
      break;
    }
    tests.push({ sections });
  }
  return { tests, shortages: [...shortages], availability };
}

const slugify = (value: string) => value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function defaultPrefix(input: Pick<BuildInput, "kind" | "level" | "sections">) {
  if (input.kind === "full") return `${cap(input.level)} Mock`;
  const first = input.sections[0];
  return `${cap(input.level)} ${first?.topic || first?.subject || "Subject"} Test`;
}

async function loadSetPool(db: Db, examId: string, section: BuildSection): Promise<Candidate[]> {
  const { rows } = await db.query<{ id: string; topic: string; difficulty: Difficulty; members: string[]; used: string }>(
    `select s.id, s.topic, s.difficulty, array_agg(q.id order by q.set_position, q.created_at) as members, max(coalesce(u.n, 0)) as used
       from question_sets s join questions q on q.set_id = s.id and q.validation_status = 'published'
       left join (select question_id, count(*) as n from test_questions group by question_id) u on u.question_id = q.id
      where s.exam_id = $1 and s.subject = $2 and ($3::text is null or s.topic = $3)
      group by s.id, s.topic, s.difficulty`,
    [examId, section.subject, section.topic ?? null]
  );
  return rows.map((row) => ({ id: row.id, topic: row.topic, difficulty: row.difficulty, used: Number(row.used), members: row.members }));
}

async function loadPool(db: Db, examId: string, section: BuildSection): Promise<Candidate[]> {
  if (section.sets) return loadSetPool(db, examId, section);
  const { rows } = await db.query<{ id: string; topic: string; difficulty: Difficulty; used: string }>(
    `select q.id, q.topic, q.difficulty, coalesce(u.n, 0) as used
       from questions q left join (select question_id, count(*) as n from test_questions group by question_id) u on u.question_id = q.id
      where q.exam_id = $1 and q.validation_status = 'published' and q.set_id is null and q.subject = $2 and ($3::text is null or q.topic = $3)`,
    [examId, section.subject, section.topic ?? null]
  );
  return rows.map((row) => ({ id: row.id, topic: row.topic, difficulty: row.difficulty, used: Number(row.used) }));
}

export type BuildReport = { created: number; planned: number; wanted: number; shortages: string[]; availability: Availability[]; titles: string[] };

// Preview (dryRun) or create tests. Everything is created in one transaction, or nothing is.
export async function buildTests(input: BuildInput, options: { dryRun: boolean }): Promise<BuildReport> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const series = (await db.query<{ exam_id: string }>("select exam_id from test_series where id = $1", [input.seriesId])).rows[0];
  if (!series) throw new Error("Series not found");

  const pools = await Promise.all(input.sections.map((section) => loadPool(db, series.exam_id, section)));
  const plan = planTests(pools, input);

  const existing = await db.query<{ slug: string; position: number; kind: string; level: string | null }>("select slug, position, kind, level from tests where series_id = $1", [input.seriesId]);
  const taken = new Set(existing.rows.map((row) => row.slug));
  let nextPosition = existing.rows.reduce((max, row) => Math.max(max, Number(row.position)), -1) + 1;
  let number = existing.rows.filter((row) => row.kind === input.kind && row.level === input.level).length + 1;
  const prefix = input.titlePrefix.trim() || defaultPrefix(input);

  const titles: string[] = [];
  const created: Array<{ title: string; slug: string; plan: TestPlan }> = [];
  for (const test of plan.tests) {
    let slug = slugify(`${prefix} ${number}`);
    while (taken.has(slug)) {
      number += 1;
      slug = slugify(`${prefix} ${number}`);
    }
    taken.add(slug);
    created.push({ title: `${prefix} ${number}`, slug, plan: test });
    titles.push(`${prefix} ${number}`);
    number += 1;
  }

  if (!options.dryRun && created.length && !plan.shortages.length) {
    await db.transaction(async (tx) => {
      for (const item of created) {
        const first = input.sections[0];
        const test = (await tx.query<{ id: string }>(
          `insert into tests (series_id, slug, title, duration_minutes, default_marks, negative_marks, is_free_sample, position, status, published_at, kind, level, subject, topic)
           values ($1,$2,$3,$4,$5,$6,false,$7,$8, case when $8 = 'published' then now() end,$9,$10,$11,$12) returning id`,
          [input.seriesId, item.slug, item.title, input.durationMinutes, input.defaultMarks, input.negativeMarks, nextPosition++, input.status, input.kind, input.level, input.kind === "full" ? null : first.subject, input.kind === "topic" ? first.topic ?? null : null]
        )).rows[0];
        let position = 0;
        for (const [index, section] of item.plan.sections.entries()) {
          const row = (await tx.query<{ id: string }>("insert into test_sections (test_id, name, position) values ($1,$2,$3) returning id", [test.id, section.section.name, index])).rows[0];
          for (let start = 0; start < section.questionIds.length; start += 400) {
            const chunk = section.questionIds.slice(start, start + 400);
            const values: unknown[] = [test.id, row.id];
            const tuples = chunk.map((id, k) => {
              values.push(id, position + k);
              return `($1,$${3 + k * 2},$2,$${4 + k * 2})`;
            });
            await tx.query(`insert into test_questions (test_id, question_id, section_id, position) values ${tuples.join(",")}`, values);
            position += chunk.length;
          }
        }
      }
    });
  }
  return { created: options.dryRun || plan.shortages.length ? 0 : created.length, planned: plan.tests.length, wanted: input.count, shortages: plan.shortages, availability: plan.availability, titles: titles.slice(0, 5) };
}

export async function publishDrafts(input: { seriesId: string; kind?: TestKind | null; level?: TestLevel | null }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const result = await db.query(
    `update tests set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
      where series_id = $1 and status = 'draft' and ($2::text is null or kind = $2) and ($3::text is null or level = $3)
        and exists (select 1 from test_questions tq where tq.test_id = tests.id)`,
    [input.seriesId, input.kind ?? null, input.level ?? null]
  );
  return result.rowCount;
}
