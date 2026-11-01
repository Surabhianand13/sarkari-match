// Constants and types shared by server code and client components. Keep database imports out of this file.
import type { FigureSpec } from "@/lib/figure";
import type { QuestionImage } from "@/lib/question-images";

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];
export const SESSION_SIZE = 10;
export const PROMOTE_AT = 0.7;
export const SESSIONS_TO_PROMOTE = 3;

export type PracticeQuestion = { id: string; stem: string; options: Record<string, string>; position: number; selected: string | null; correctOption: string | null; explanation: string | null; figure: FigureSpec | null; image: QuestionImage | null };
export type PracticeSession = { id: string; subject: string; topic: string | null; level: Level; status: "in_progress" | "completed"; total: number; correct: number; questions: PracticeQuestion[] };
export type SubjectSummary = { subject: string; questions: number; topics: string[] };
