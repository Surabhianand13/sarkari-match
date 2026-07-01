import { format, parseISO } from "date-fns";

export function formatDate(value: string) {
  return format(parseISO(value), "d MMM yyyy");
}

export function slugTitle(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
