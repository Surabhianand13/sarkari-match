// Business details shown on the legal pages and contact page. Set them with environment variables before launch.
// Anything left empty is simply not shown.
export const business = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME || "Sarkari Match",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@sarkarimatch.com",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  grievanceOfficer: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER || ""
};

export const LEGAL_UPDATED = "27 October 2026";

export function contactLines() {
  return [business.name, business.address && `Address: ${business.address}`, `Email: ${business.supportEmail}`, business.phone && `Phone: ${business.phone}`].filter(Boolean) as string[];
}
