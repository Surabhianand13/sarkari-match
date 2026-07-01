import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/subscriptions";

export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature({ body, signature, secret })) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  // Persistence and entitlement granting happen server-side once Supabase service-role access is configured.
  return NextResponse.json({ ok: true, received: true });
}
