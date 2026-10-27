import { z } from 'zod';

export const evidenceTypes = ['chat_transcript', 'image', 'cctv_log', 'witness_statement', 'document', 'physical_clue'];
const nonempty = z.string().trim().min(1).max(2400);
export const mysterySchema = z.object({
  title: nonempty, premise: nonempty, incident: nonempty, difficulty: z.enum(['easy', 'medium', 'hard']),
  suspects: z.array(z.object({ id: nonempty, name: nonempty, role: nonempty, profile: nonempty, possibleMotive: nonempty, alibi: nonempty })).min(3).max(5),
  timeline: z.array(z.object({ id: nonempty, timestamp: nonempty, event: nonempty, relatedSuspectIds: z.array(nonempty), relatedEvidenceIds: z.array(nonempty) })).min(4),
  evidence: z.array(z.object({ id: nonempty, type: z.enum(evidenceTypes), title: nonempty, summary: nonempty, content: nonempty, timestamp: nonempty.optional(), timeLabel: nonempty.optional(), location: z.string().optional(), reliability: z.enum(['low', 'medium', 'high']), relatedSuspectIds: z.array(nonempty) })).min(6),
  solution: z.object({ culpritSuspectId: nonempty, motive: nonempty, explanation: nonempty, supportingEvidenceIds: z.array(nonempty).min(3), alternativeSuspectExplanations: z.array(z.object({ suspectId: nonempty, explanation: nonempty })).min(2) })
});

export function validateMystery(value) {
  const parsed = mysterySchema.safeParse(value);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  const m = parsed.data;
  const suspectIds = new Set(m.suspects.map((s) => s.id));
  const evidenceIds = new Set(m.evidence.map((e) => e.id));
  const timelineIds = new Set(m.timeline.map((t) => t.id));
  if (suspectIds.size !== m.suspects.length || evidenceIds.size !== m.evidence.length || timelineIds.size !== m.timeline.length) return { ok: false, reason: 'IDs must be unique.' };
  if (m.evidence.some((e) => !e.timestamp && !e.timeLabel)) return { ok: false, reason: 'Every evidence item needs a timestamp or time label.' };
  const parsedTimes = m.timeline.map((t) => Date.parse(t.timestamp));
  if (parsedTimes.every(Number.isFinite) && parsedTimes.some((time, index) => index > 0 && time < parsedTimes[index - 1])) return { ok: false, reason: 'Timeline events must be chronologically ordered.' };
  if (!suspectIds.has(m.solution.culpritSuspectId)) return { ok: false, reason: 'Culprit must reference a suspect.' };
  if (new Set(m.evidence.map((e) => e.type)).size < 3) return { ok: false, reason: 'Use at least three evidence types.' };
  if (new Set(m.solution.supportingEvidenceIds).size < 3 || m.solution.supportingEvidenceIds.some((id) => !evidenceIds.has(id))) return { ok: false, reason: 'Solution must cite at least three existing evidence items.' };
  for (const e of m.evidence) if (e.relatedSuspectIds.some((id) => !suspectIds.has(id))) return { ok: false, reason: 'Evidence contains an unknown suspect reference.' };
  for (const t of m.timeline) if (t.relatedSuspectIds.some((id) => !suspectIds.has(id)) || t.relatedEvidenceIds.some((id) => !evidenceIds.has(id))) return { ok: false, reason: 'Timeline contains a dangling reference.' };
  if (!m.solution.alternativeSuspectExplanations.every((a) => suspectIds.has(a.suspectId))) return { ok: false, reason: 'Alternative suspect reference must exist.' };
  return { ok: true, data: m };
}

export function safeCase(m, id) {
  const { solution, generationMetadata, expiresAt, _id, __v, ...publicCase } = m;
  return { ...publicCase, caseId: String(id), demo: generationMetadata?.provider === 'demo', generationMetadata: { provider: generationMetadata?.provider, generatedAt: generationMetadata?.generatedAt } };
}
