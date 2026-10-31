// Several topics can be started at once; each becomes its own run.
export const MAX_TOPICS_PER_START = 20;

// One topic per line (a semicolon also separates). Commas stay inside a topic, as in "Time, Speed and Distance". Repeats are dropped, ignoring case.
export function parseTopics(raw: string): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const part of raw.split(/[\n;]+/)) {
    const topic = part.replace(/\s+/g, " ").trim().slice(0, 120);
    if (topic && !seen.has(topic.toLowerCase())) {
      seen.add(topic.toLowerCase());
      topics.push(topic);
    }
  }
  return topics;
}
