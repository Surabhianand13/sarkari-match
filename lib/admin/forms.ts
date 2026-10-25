export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : value;
}

export function integer(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function decimal(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

// Rupees typed in a form to paise stored in the database.
export function rupeesToPaise(formData: FormData, key: string) {
  const value = decimal(formData, key);
  return value === null ? null : Math.round(value * 100);
}

export function paiseToRupees(paise: number | null | undefined) {
  return paise === null || paise === undefined ? "" : String(paise / 100);
}
