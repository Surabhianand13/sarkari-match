import { revalidatePath } from "next/cache";

// Public pages are statically cached for an hour; admin changes refresh them immediately.
export function revalidatePublicContent() {
  revalidatePath("/", "page");
  revalidatePath("/jobs", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  revalidatePath("/llms-full.txt");
  revalidatePath("/tests", "layout");
  revalidatePath("/pricing");
}
