import type { NextRequest } from "next/server";
import { z } from "zod";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { clientIp, errorResponse, json, readJson } from "@/lib/http";

export async function POST(req: NextRequest) {
  const c = container();
  try {
    // Aquí solo se comprueba que sea JSON: el caso de uso cuenta el intento y después valida.
    const input = await readJson(req, z.unknown());
    const result = await c.registerParticipant.execute({
      slug: tournamentSlug(),
      input,
      clientIp: clientIp(req, c.env.TRUSTED_PROXY_HOPS),
    });
    return json(
      {
        ok: true,
        gamerTag: result.gamerTag,
        participantCount: result.participantCount,
        confirmationEmailSent: result.confirmationEmailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
