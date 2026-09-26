import { describe, expect, it } from "vitest";
import {
  championId,
  countPlayable,
  currentRound,
  decideMatch,
  MAX_PARTICIPANTS,
  nextPowerOfTwo,
  planBracket,
  planByeFill,
  planUndo,
  planWithdrawal,
  roundName,
  runnerUpId,
  spreadByeIndexes,
} from "@/core/domain/bracket";
import { DomainError } from "@/core/domain/errors";
import type { Match } from "@/core/domain/match";
import { fisherYatesShuffle } from "@/core/domain/shuffle";

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** Materializa un plan como filas con id, como quedarían en PostgreSQL. */
function materialize(ids: string[]): Match[] {
  const plan = planBracket(ids);
  const idOf = (r: number, p: number) => `m${r}-${p}`;
  return plan.matches.map((m) => ({
    id: idOf(m.round, m.position),
    tournamentId: "t",
    round: m.round,
    position: m.position,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    winnerId: m.winnerId,
    nextMatchId: m.next ? idOf(m.next.round, m.next.position) : null,
    nextSlot: m.next?.slot ?? null,
    createdAt: new Date(0),
  }));
}

/** Aplica una decisión como lo hace el caso de uso SelectWinner. */
function apply(matches: Match[], matchId: string, winnerId: string): Match[] {
  const d = decideMatch(matches, matchId, winnerId);
  return matches.map((m) => {
    if (m.id === d.matchId) return { ...m, winnerId: d.winnerId };
    if (d.advance && m.id === d.advance.matchId) {
      return d.advance.slot === 1 ? { ...m, player1Id: d.winnerId } : { ...m, player2Id: d.winnerId };
    }
    return m;
  });
}

describe("nextPowerOfTwo", () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 4],
    [6, 8],
    [8, 8],
    [9, 16],
    [100, 128],
  ])("%i → %i", (n, p) => expect(nextPowerOfTwo(n)).toBe(p));
});

describe("planBracket", () => {
  it("6 jugadores → cuadro de 8 con 2 BYE y 3 rondas", () => {
    const plan = planBracket(players(6));
    expect(plan.size).toBe(8);
    expect(plan.byes).toBe(2);
    expect(plan.roundCount).toBe(3);
    expect(plan.matches.filter((m) => m.round === 1)).toHaveLength(4);
    expect(plan.matches.filter((m) => m.round === 2)).toHaveLength(2);
    expect(plan.matches.filter((m) => m.round === 3)).toHaveLength(1);
  });

  it.each([2, 3, 5, 6, 7, 8, 13, 16])("con %i jugadores cada uno aparece exactamente una vez en ronda 1", (n) => {
    const plan = planBracket(players(n));
    const first = plan.matches.filter((m) => m.round === 1);
    const seen = first.flatMap((m) => [m.player1Id, m.player2Id]).filter((x): x is string => x !== null);
    expect(seen.sort()).toEqual(players(n).sort());
    // Nunca un encuentro vacío: como mucho un BYE por encuentro.
    expect(first.every((m) => m.player1Id !== null)).toBe(true);
  });

  it("quien recibe BYE ya gana y aparece en la segunda ronda", () => {
    const plan = planBracket(players(6));
    const byes = plan.matches.filter((m) => m.round === 1 && m.player2Id === null);
    expect(byes).toHaveLength(2);
    for (const b of byes) {
      expect(b.winnerId).toBe(b.player1Id);
      const next = plan.matches.find((m) => m.round === 2 && m.position === b.next!.position)!;
      expect(b.next!.slot === 1 ? next.player1Id : next.player2Id).toBe(b.player1Id);
    }
  });

  it("reparte los BYE: con 5 de 8 los tres BYE no quedan juntos arriba", () => {
    expect([...spreadByeIndexes(3, 4)]).toEqual([0, 1, 2]);
    expect([...spreadByeIndexes(2, 4)]).toEqual([0, 2]);
    expect([...spreadByeIndexes(4, 8)]).toEqual([0, 2, 4, 6]);
  });

  it("enlaza cada encuentro con el siguiente y la final no tiene siguiente", () => {
    const plan = planBracket(players(8));
    for (const m of plan.matches) {
      if (m.round === plan.roundCount) expect(m.next).toBeNull();
      else expect(m.next).toEqual({ round: m.round + 1, position: Math.ceil(m.position / 2), slot: m.position % 2 ? 1 : 2 });
    }
  });

  it("rechaza menos de 2 jugadores y jugadores repetidos", () => {
    expect(() => planBracket(["solo"])).toThrow(DomainError);
    expect(() => planBracket(["a", "a", "b"])).toThrow(DomainError);
  });
});

describe("decideMatch y avance", () => {
  it("lleva un torneo de 6 jugadores hasta el campeón", () => {
    let ms = materialize(players(6));
    let guard = 0;
    while (championId(ms) === null && guard++ < 20) {
      expect(runnerUpId(ms)).toBeNull();
      const next = ms.find((m) => m.winnerId === null && m.player1Id && m.player2Id)!;
      ms = apply(ms, next.id, next.player1Id!);
    }
    expect(championId(ms)).not.toBeNull();
    expect(currentRound(ms)).toBeNull();
    // El segundo lugar es quien perdió la final.
    const final = ms.find((m) => m.nextMatchId === null)!;
    expect(runnerUpId(ms)).toBe(final.player2Id);
    expect(runnerUpId(ms)).not.toBe(championId(ms));
  });

  it("no deja decidir un encuentro incompleto ni un BYE ni un ganador ajeno", () => {
    const ms = materialize(players(6));
    const bye = ms.find((m) => m.round === 1 && m.player2Id === null)!;
    expect(() => decideMatch(ms, bye.id, bye.player1Id!)).toThrowError(/BYE/);
    const final = ms.find((m) => m.nextMatchId === null)!;
    expect(() => decideMatch(ms, final.id, "p1")).toThrowError(/falta un jugador/);
    const real = ms.find((m) => m.round === 1 && m.player2Id !== null)!;
    expect(() => decideMatch(ms, real.id, "intruso")).toThrowError(/uno de los dos/);
  });

  it("permite corregir un resultado mientras el siguiente no se jugó, y reemplaza al que había avanzado", () => {
    let ms = materialize(players(4));
    const [a, b] = ms.filter((m) => m.round === 1);
    ms = apply(ms, a!.id, a!.player1Id!);
    ms = apply(ms, a!.id, a!.player2Id!);
    const final = ms.find((m) => m.round === 2)!;
    expect(final.player1Id).toBe(a!.player2Id);

    ms = apply(ms, b!.id, b!.player1Id!);
    ms = apply(ms, final.id, a!.player2Id!);
    expect(() => decideMatch(ms, a!.id, a!.player1Id!)).toThrowError(/siguiente ya tiene ganador/);
  });

  it("2 jugadores: una sola final", () => {
    const ms = materialize(["x", "y"]);
    expect(ms).toHaveLength(1);
    const d = decideMatch(ms, ms[0]!.id, "y");
    expect(d.decidesChampion).toBe(true);
    expect(d.advance).toBeNull();
  });
});

describe("roundName", () => {
  it("8 jugadores: Ronda 1 · Semifinales · Final", () => {
    expect([1, 2, 3].map((r) => roundName(r, 3))).toEqual(["Ronda 1", "Semifinales", "Final"]);
  });
  it("32 jugadores", () => {
    expect([1, 2, 3, 4, 5].map((r) => roundName(r, 5))).toEqual([
      "Ronda 1",
      "Octavos de final",
      "Cuartos de final",
      "Semifinales",
      "Final",
    ]);
  });
});

describe("fisherYatesShuffle", () => {
  it("no muta la entrada y conserva los elementos", () => {
    const input = players(10);
    const copy = [...input];
    const out = fisherYatesShuffle(input, (max) => max - 1);
    expect(input).toEqual(copy);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("con fuente uniforme, las 6 permutaciones de 3 salen con frecuencia pareja", async () => {
    const { randomInt } = await import("node:crypto");
    const counts = new Map<string, number>();
    const N = 60_000;
    for (let i = 0; i < N; i++) {
      const k = fisherYatesShuffle(["a", "b", "c"], (m) => randomInt(m)).join("");
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const c of counts.values()) expect(Math.abs(c - N / 6)).toBeLessThan(N * 0.01);
  });

  it("rechaza una fuente que se sale de rango", () => {
    expect(() => fisherYatesShuffle([1, 2, 3], () => 7)).toThrow(RangeError);
  });
});

/** Juega el torneo entero eligiendo ganadores con `pick`. Devuelve el cuadro final y cuántas partidas hubo. */
function playOut(start: Match[], pick: (m: Match) => string): { matches: Match[]; played: number } {
  let ms = start;
  let played = 0;
  for (;;) {
    const next = ms.find((m) => m.winnerId === null && m.player1Id !== null && m.player2Id !== null);
    if (!next) break;
    ms = apply(ms, next.id, pick(next));
    played++;
  }
  return { matches: ms, played };
}

describe("de 2 a 16 jugadores el cuadro nunca queda roto", () => {
  it.each(Array.from({ length: 15 }, (_, i) => i + 2))("%i jugadores", (n) => {
    const ids = players(n);
    const ms = materialize(ids);

    // Cada jugador aparece una sola vez en primera ronda y ningún encuentro queda vacío.
    const first = ms.filter((m) => m.round === 1);
    const seated = first.flatMap((m) => [m.player1Id, m.player2Id]).filter((x) => x !== null);
    expect(seated.sort()).toEqual([...ids].sort());
    expect(first.every((m) => m.player1Id !== null || m.player2Id !== null)).toBe(true);

    // Un eliminatorio de n jugadores tiene exactamente n-1 partidas reales.
    expect(countPlayable(ms).total).toBe(n - 1);

    for (const side of [1, 2] as const) {
      const { matches, played } = playOut(ms, (m) => (side === 1 ? m.player1Id! : m.player2Id!));
      expect(played).toBe(n - 1);
      expect(championId(matches)).not.toBeNull();
      expect(currentRound(matches)).toBeNull();
    }
  });

  it("17 jugadores no se pueden sortear", () => {
    expect(MAX_PARTICIPANTS).toBe(16);
    expect(() => planBracket(players(17))).toThrow(DomainError);
  });
});

/** Aplica un alta sobre un BYE como lo hace ManageParticipants. */
function fillBye(ms: Match[], newId: string): Match[] {
  const f = planByeFill(ms, () => 0);
  return ms.map((m) => {
    if (f.retract && m.id === f.retract.matchId) return f.retract.slot === 1 ? { ...m, player1Id: null } : { ...m, player2Id: null };
    if (m.id === f.matchId) return f.slot === 1 ? { ...m, player1Id: newId, winnerId: null } : { ...m, player2Id: newId, winnerId: null };
    return m;
  });
}

describe("altas y bajas con el cuadro sorteado", () => {
  it("de 9 se puede llegar a 16 llenando BYE, y el 17.º no cabe", () => {
    let ms = materialize(players(9));
    for (let i = 10; i <= 16; i++) ms = fillBye(ms, `p${i}`);
    expect(countPlayable(ms).total).toBe(15);
    expect(ms.filter((m) => m.round === 2).every((m) => m.player1Id === null && m.player2Id === null)).toBe(true);
    expect(() => planByeFill(ms, () => 0)).toThrowError(/huecos/);
    expect(playOut(ms, (m) => m.player2Id!).played).toBe(15);
  });

  it("la baja deja pasar al rival y su hueco lo toma la siguiente alta", () => {
    let ms = materialize(players(8));
    const w = planWithdrawal(ms, "p1");
    ms = ms.map((m) => {
      if (m.id === w.matchId) {
        const cleared = w.slot === 1 ? { ...m, player1Id: null } : { ...m, player2Id: null };
        return { ...cleared, winnerId: w.opponentId };
      }
      if (m.id === w.advance.matchId) return w.advance.slot === 1 ? { ...m, player1Id: w.opponentId } : { ...m, player2Id: w.opponentId };
      return m;
    });
    expect(countPlayable(ms).total).toBe(6);
    ms = fillBye(ms, "nuevo");
    expect(countPlayable(ms).total).toBe(7);
    expect(playOut(ms, (m) => m.player1Id!).played).toBe(7);
  });

  it("no se deshace un resultado si el siguiente ya se jugó", () => {
    const ms = materialize(players(4));
    const [a, b] = ms.filter((m) => m.round === 1);
    let played = apply(ms, a!.id, a!.player1Id!);
    played = apply(played, b!.id, b!.player1Id!);
    const final = played.find((m) => m.round === 2)!;
    played = apply(played, final.id, final.player1Id!);
    expect(() => planUndo(played, a!.id)).toThrowError(/siguiente/);
    expect(planUndo(played, final.id)).toEqual({ matchId: final.id, retract: null });
  });
});
