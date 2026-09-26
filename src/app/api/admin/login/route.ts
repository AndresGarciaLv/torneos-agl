import type { NextRequest } from "next/server";
import { loginSchema } from "@/core/application/schemas";
import { container } from "@/infrastructure/container";
import { setAdminCookie } from "@/lib/admin-session";
import { assertSameOrigin, clientIp, errorResponse, json, readJson } from "@/lib/http";

export async function POST(req: NextRequest) {
  const c = container();
  try {
    assertSameOrigin(req);
    const { password } = await readJson(req, loginSchema);
    const session = await c.adminLogin.execute(password, clientIp(req, c.env.TRUSTED_PROXY_HOPS));
    const res = json({ ok: true });
    setAdminCookie(res, session);
    return res;
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
