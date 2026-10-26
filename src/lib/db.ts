"use client";

/**
 * Encrypted local database.
 *
 * Sessions and scores are serialised to JSON, encrypted with AES-GCM using a
 * non-extractable key that lives only in this device's IndexedDB, and stored
 * as ciphertext. Nothing ever leaves the device.
 */
import Dexie, { type Table } from "dexie";
import type { GameId, Reward, Score, Session } from "@/lib/types";

interface EncryptedRow {
  id: string;
  game: GameId;
  at: string; // ISO, kept in the clear for ordering only
  iv: Uint8Array;
  data: Uint8Array;
}

interface KeyRow {
  id: string;
  key: CryptoKey;
}

class BrainCompassDB extends Dexie {
  sessions!: Table<EncryptedRow, string>;
  scores!: Table<EncryptedRow, string>;
  rewards!: Table<EncryptedRow, string>;
  keys!: Table<KeyRow, string>;

  constructor() {
    // Storage name predates the BrainCompass rename; changing it would orphan every saved session.
    super("neurotrace");
    this.version(1).stores({
      sessions: "id, game, at",
      scores: "id, game, at",
      rewards: "id, game, at",
      keys: "id",
    });
  }
}

let db: BrainCompassDB | null = null;
function getDb() {
  if (!db) db = new BrainCompassDB();
  return db;
}

let keyPromise: Promise<CryptoKey> | null = null;
async function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const d = getDb();
      const existing = await d.keys.get("device");
      if (existing) return existing.key;
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
        "encrypt",
        "decrypt",
      ]);
      await d.keys.put({ id: "device", key });
      return key;
    })();
  }
  return keyPromise;
}

async function encrypt(value: unknown): Promise<{ iv: Uint8Array; data: Uint8Array }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return { iv, data: new Uint8Array(cipher) };
}

async function decrypt<T>(row: EncryptedRow): Promise<T> {
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: row.iv as BufferSource },
    key,
    row.data as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export async function saveSession(session: Session): Promise<void> {
  const enc = await encrypt(session);
  await getDb().sessions.put({ id: session.id, game: session.game, at: session.endedAt, ...enc });
}

export async function saveScore(score: Score): Promise<void> {
  const enc = await encrypt(score);
  await getDb().scores.put({ id: score.sessionId, game: score.game, at: score.at, ...enc });
}

export async function saveReward(reward: Reward): Promise<void> {
  const enc = await encrypt(reward);
  await getDb().rewards.put({ id: reward.id, game: reward.game, at: reward.earnedAt, ...enc });
}

export async function listSessions(game?: GameId): Promise<Session[]> {
  const rows = game
    ? await getDb().sessions.where("game").equals(game).sortBy("at")
    : await getDb().sessions.orderBy("at").toArray();
  return Promise.all(rows.map((r) => decrypt<Session>(r)));
}

export async function listScores(game?: GameId): Promise<Score[]> {
  const rows = game
    ? await getDb().scores.where("game").equals(game).sortBy("at")
    : await getDb().scores.orderBy("at").toArray();
  return Promise.all(rows.map((r) => decrypt<Score>(r)));
}

export async function listRewards(): Promise<Reward[]> {
  const rows = await getDb().rewards.orderBy("at").toArray();
  return Promise.all(rows.map((r) => decrypt<Reward>(r)));
}

export async function deleteSession(id: string): Promise<void> {
  const d = getDb();
  await d.transaction("rw", d.sessions, d.scores, d.rewards, async () => {
    await d.sessions.delete(id);
    await d.scores.delete(id);
    const rewards = await d.rewards.toArray();
    for (const r of rewards) {
      const reward = await decrypt<Reward>(r);
      if (reward.sessionId === id) await d.rewards.delete(r.id);
    }
  });
}

export async function deleteAllData(): Promise<void> {
  const d = getDb();
  await d.transaction("rw", d.sessions, d.scores, d.rewards, d.keys, async () => {
    await d.sessions.clear();
    await d.scores.clear();
    await d.rewards.clear();
    await d.keys.clear();
  });
  keyPromise = null;
}
