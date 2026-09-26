import type { NextRequest } from "next/server";
import { container } from "@/infrastructure/container";
import { clearAdminCookie } from "@/lib/admin-session";
import { assertSameOrigin, errorResponse, json } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const res = json({ ok: true });
    clearAdminCookie(res);
    return res;
  } catch (error) {
    return errorResponse(error, (e, f) => container().logger.error(e, f));
  }
}
