export function remainingFromDeadline(endAt: number, now = Date.now()): number {
  return Math.max(0, endAt - now);
}

export function detectClockJump(previousWall: number, previousMono: number, currentWall: number, currentMono: number, toleranceMs = 5_000): boolean {
  return Math.abs((currentWall - previousWall) - (currentMono - previousMono)) > toleranceMs;
}
