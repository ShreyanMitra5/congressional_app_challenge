"use client";

/**
 * Shared session plumbing for the three games: the interruption hook that
 * pauses on calls / backgrounding / rotation, and the finish step that saves
 * the session to the encrypted store, scores it, and records the reward.
 */
import { useEffect, useRef } from "react";
import { listScores, saveReward, saveScore, saveSession } from "@/lib/db";
import { scoreSession } from "@/lib/scoring";
import { uuid } from "@/lib/rng";
import type { GameId, Reward, RewardId, Score, Session, WorldId } from "@/lib/types";

export const REWARD_FOR_GAME: Record<GameId, { id: RewardId; name: string }> = {
  fireflyWatch: { id: "lantern", name: "A little lantern" },
  fireflyTrail: { id: "stone", name: "A stepping-stone" },
  nightWatch: { id: "lanternString", name: "A paper lantern string" },
};

export const NIGHT_WATCH_REWARD: Record<WorldId, { id: RewardId; name: string }> = {
  forest: { id: "lanternString", name: "A paper lantern string" },
  space: { id: "beacon", name: "A small beacon" },
  neon: { id: "windowLight", name: "A window light" },
};

export interface FinishResult {
  score: Score;
  reward: Reward;
  /** ms from the last event to the score being ready */
  scoringLatencyMs: number;
}

/**
 * Persist a finished session, score it against the child's earlier sessions,
 * and hand back the reward. Everything is local and offline.
 */
export async function finishSession(
  session: Session,
  reward: { id: RewardId; name: string },
  lastEventAtMs: number,
): Promise<FinishResult> {
  const prior = await listScores(session.game);
  const score = scoreSession(session, prior);
  const scoringLatencyMs = performance.now() - lastEventAtMs;
  await saveSession(session);
  await saveScore(score);
  const r: Reward = {
    id: uuid(),
    rewardId: reward.id,
    name: reward.name,
    game: session.game,
    sessionId: session.id,
    earnedAt: session.endedAt,
  };
  await saveReward(r);
  return { score, reward: r, scoringLatencyMs };
}

/**
 * Fires `onInterrupt` the moment the page is hidden, loses focus, or the
 * device rotates — a call, a notification shade, backgrounding. The game
 * must stop every timer at once and show the pause message.
 */
export function useInterruption(onInterrupt: () => void, active: boolean) {
  const cb = useRef(onInterrupt);
  useEffect(() => {
    cb.current = onInterrupt;
  });
  useEffect(() => {
    if (!active) return;
    const vis = () => {
      if (document.visibilityState === "hidden") cb.current();
    };
    const blur = () => cb.current();
    const orient = () => cb.current();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", blur);
    window.addEventListener("orientationchange", orient);
    screen.orientation?.addEventListener?.("change", orient);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", blur);
      window.removeEventListener("orientationchange", orient);
      screen.orientation?.removeEventListener?.("change", orient);
    };
  }, [active]);
}

/** Wait for the next painted frame and resolve with the time it was drawn. */
export function nextPaint(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      // The callback runs just before paint; a second rAF runs after that frame was presented.
      requestAnimationFrame((t) => resolve(t));
    });
  });
}

/** A cancellable timer set. */
export class Timers {
  private ids = new Set<number>();
  set(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this.ids.delete(id);
      fn();
    }, ms);
    this.ids.add(id);
    return id;
  }
  clear(id: number) {
    window.clearTimeout(id);
    this.ids.delete(id);
  }
  clearAll() {
    for (const id of this.ids) window.clearTimeout(id);
    this.ids.clear();
  }
}
