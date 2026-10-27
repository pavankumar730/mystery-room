import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Mystery, PlaySession } from '../models/index.js';

const memory = { cases: new Map(), sessions: new Map() };
export const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('base64url');
export const newId = () => crypto.randomUUID();
export const expiryDate = (days) => new Date(Date.now() + days * 86400000);
export const isMongo = () => Boolean(globalThis.mongoReady);

export async function saveCase(data) {
  if (isMongo()) { const doc = await Mystery.create(data); return String(doc._id); }
  const id = newId(); memory.cases.set(id, structuredClone(data)); return id;
}
export async function getCase(id) {
  if (isMongo()) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Mystery.findOne({ _id: id, status: 'ready', expiresAt: { $gt: new Date() } }).lean();
  }
  const item = memory.cases.get(id);
  if (!item || item.expiresAt <= new Date()) { memory.cases.delete(id); return null; }
  return structuredClone(item);
}
export async function createSession(caseId, token, expiresAt) {
  if (isMongo()) return PlaySession.create({ mysteryId: caseId, sessionTokenHash: tokenHash(token), expiresAt });
  memory.sessions.set(`${caseId}:${tokenHash(token)}`, { mysteryId: caseId, sessionTokenHash: tokenHash(token), status: 'in_progress', expiresAt });
}
export async function getSession(caseId, token) {
  if (!token) return null;
  if (isMongo()) {
    if (!mongoose.isValidObjectId(caseId)) return null;
    return PlaySession.findOne({ mysteryId: caseId, sessionTokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
  }
  const key = `${caseId}:${tokenHash(token)}`;
  const session = memory.sessions.get(key);
  if (!session || session.expiresAt <= new Date()) { memory.sessions.delete(key); return null; }
  return session;
}
export async function completeSession(session, selectedSuspectId, reason, isCorrect, score, result) {
  if (isMongo()) {
    const updated = await PlaySession.findOneAndUpdate({ _id: session._id, status: 'in_progress' }, { $set: { status: 'completed', selectedSuspectId, submittedReason: reason, isCorrect, score, result, submittedAt: new Date() } }, { new: true });
    return updated;
  }
  if (session.status !== 'in_progress') return null;
  Object.assign(session, { status: 'completed', selectedSuspectId, submittedReason: reason, isCorrect, score, result, submittedAt: new Date() }); return session;
}
export async function loadResult(session) { return session?.status === 'completed' ? session.result : null; }
