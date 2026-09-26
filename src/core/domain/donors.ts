/**
 * Top de donadores del live. Solo cuentan regalos reales (monedas × cantidad),
 * no los "mejores espectadores" de TikTok, que mezclan otras cosas y sacan del
 * ranking a quien se va del directo.
 */
export interface LiveGift {
  /**
   * Identifica un regalo o una racha. TikTok manda un evento por cada toque de
   * una racha (x1, x2, x3…): todos comparten esta llave y solo cuenta el mayor.
   */
  readonly streakKey: string;
  readonly user: string;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly giftName: string;
  /** Monedas que cuesta UN regalo. */
  readonly coinsEach: number;
  readonly repeatCount: number;
}

export interface Donor {
  readonly user: string;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly coins: number;
}

export const TOP_DONORS = 3;

/**
 * Llave de racha. Los regalos combinables (rosas, corazones…) repiten
 * usuario + regalo + grupo en cada toque; los demás son únicos por mensaje.
 */
export function giftStreakKey(input: {
  userId: string;
  giftId: string;
  groupId: string;
  combo: boolean;
  msgId: string;
}): string {
  if (input.combo && input.groupId && input.groupId !== "0") {
    return `s:${input.userId}:${input.giftId}:${input.groupId}`;
  }
  return `m:${input.msgId || `${input.userId}:${input.giftId}:${Date.now()}`}`;
}
