import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import crypto from 'node:crypto';
import { z } from 'zod';
import { demoMystery } from './seed/demoMystery.js';
import { completeSession, createSession, expiryDate, getCase, getSession, isMongo, loadResult, newToken, saveCase } from './services/store.js';
import { generateMystery } from './services/geminiService.js';
import { safeCase, validateMystery } from './validators/mystery.js';
import { scoreAccusation } from './services/scoringService.js';
import { validateScenario } from './validators/scenario.js';

const secret = process.env.SESSION_SECRET || 'local-development-only-change-this-secret';
const fail = (res, status, code, message) => res.status(status).json({ data: null, error: { code, message } });
const rateLimitHandler = (_req, res) => fail(res, 429, 'RATE_LIMITED', 'Please wait a moment before trying again.');
const generationLimit = rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000, limit: Number(process.env.GENERATION_RATE_LIMIT) || 5, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });
const accusationLimit = rateLimit({ windowMs: 60000, limit: 12, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });
const ttlHours = Number(process.env.SESSION_TTL_HOURS) || 24;
const ttlDays = Number(process.env.MYSTERY_TTL_DAYS) || 7;

function safeProviderError(error) {
  return String(error?.message || 'unknown')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 240);
}

export function createApp({ generate = generateMystery, persistenceReady = isMongo, createSessionCase } = {}) {
  const app = express();
  const saveSessionCase = createSessionCase || startSession;
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '24kb' }));
  app.use(cookieParser(secret));
  app.use((req, res, next) => { req.requestId = crypto.randomUUID(); res.setHeader('X-Request-Id', req.requestId); next(); });
  app.get('/', (_req, res) => res.json({ data: { service: 'AI Mystery Room API', health: '/api/health' }, error: null }));
  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok', mode: persistenceReady() ? 'persistent' : 'demo', persistence: persistenceReady() ? 'mongodb' : 'temporary-memory', generationConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL) }, error: null }));

async function startSession(mystery, response, { demo = false } = {}) {
  const expiresAt = expiryDate(ttlHours / 24);
  const caseData = { schemaVersion: 1, ...mystery, status: 'ready', expiresAt: expiryDate(ttlDays) };
  const id = await saveCase(caseData);
  const token = newToken();
  await createSession(id, token, expiresAt);
  response.cookie('mr_session', token, { signed: true, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: ttlHours * 3600000, path: '/' });
  return { caseId: id, case: { ...safeCase(caseData, id), demo } };
}
async function authorized(req) {
  const token = req.signedCookies?.mr_session;
  const [mystery, session] = await Promise.all([getCase(req.params.caseId), getSession(req.params.caseId, token)]);
  return mystery && session ? { mystery, session } : null;
}

app.post('/api/mysteries/demo', async (_req, res, next) => {
  try {
    const valid = validateMystery(demoMystery);
    if (!valid.ok) throw new Error(`Demo case invalid: ${valid.reason}`);
    const data = await saveSessionCase({ ...valid.data, originalScenario: 'A rare orchid vanished from a fictional conservatory during its winter showcase.', generationMetadata: demoMystery.generationMetadata }, res, { demo: true });
    res.status(201).json({ data, error: null });
  } catch (error) { next(error); }
});

app.post('/api/mysteries', generationLimit, async (req, res, next) => {
  const parsed = validateScenario(req.body, Number(process.env.MAX_SCENARIO_LENGTH) || 1000);
  if (!parsed.ok) return fail(res, parsed.code === 'SCENARIO_REJECTED' ? 422 : 400, parsed.code, parsed.message);
  if (!persistenceReady()) return fail(res, 503, 'PERSISTENCE_UNAVAILABLE', 'New cases require MongoDB persistence. You can still play the clearly labelled sample case while the database is unavailable.');
  let mystery;
  let usedFallback = false;
  try {
    mystery = await generate({ ...parsed.data, timeoutMs: Number(process.env.GENERATION_TIMEOUT_MS) || 45000 });
    mystery.originalScenario = parsed.data.scenario;
    mystery.category = parsed.data.category;
    const valid = validateMystery(mystery);
    if (!valid.ok) throw new Error(`Generated case failed validation: ${valid.reason}`);
  } catch (error) {
    console.error(JSON.stringify({ requestId: req.requestId, event: 'generation_failed', errorName: error?.name || 'Error', status: error?.status || error?.code || undefined, message: safeProviderError(error) }));
    const sample = validateMystery(demoMystery);
    if (!sample.ok) return fail(res, 500, 'FALLBACK_UNAVAILABLE', 'The sample case is temporarily unavailable. Please try again.');
    mystery = { ...sample.data, category: demoMystery.category, generationMetadata: demoMystery.generationMetadata };
    usedFallback = true;
  }
  const data = await saveSessionCase(mystery, res, { demo: usedFallback });
  res.status(201).json({ data: usedFallback ? { ...data, fallback: true } : data, error: null });
});

app.get('/api/mysteries/:caseId', async (req, res, next) => {
  try { const access = await authorized(req); if (!access) return fail(res, 404, 'CASE_UNAVAILABLE', 'This case is unavailable or has expired.'); res.json({ data: safeCase(access.mystery, req.params.caseId), error: null }); }
  catch (error) { next(error); }
});
app.get('/api/mysteries/:caseId/evidence/:evidenceId', async (req, res, next) => {
  try { const access = await authorized(req); if (!access) return fail(res, 404, 'CASE_UNAVAILABLE', 'This case is unavailable or has expired.'); const item = access.mystery.evidence.find((e) => e.id === req.params.evidenceId); if (!item) return fail(res, 404, 'EVIDENCE_NOT_FOUND', 'Evidence could not be found.'); res.json({ data: item, error: null }); }
  catch (error) { next(error); }
});
app.post('/api/mysteries/:caseId/replay', async (req, res, next) => {
  try {
    const access = await authorized(req); if (!access) return fail(res, 404, 'CASE_UNAVAILABLE', 'This case is unavailable or has expired.');
    const token = newToken(); const expiresAt = expiryDate(ttlHours / 24); await createSession(req.params.caseId, token, expiresAt);
    res.cookie('mr_session', token, { signed: true, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: ttlHours * 3600000, path: '/' });
    res.json({ data: safeCase(access.mystery, req.params.caseId), error: null });
  } catch (error) { next(error); }
});
app.post('/api/mysteries/:caseId/accusation', accusationLimit, async (req, res, next) => {
  const body = z.object({ suspectId: z.string().min(1).max(80), reason: z.string().max(500).optional().default('') }).strict().safeParse(req.body);
  if (!body.success) return fail(res, 400, 'VALIDATION_ERROR', 'Choose one suspect and keep your explanation under 500 characters.');
  try {
    const access = await authorized(req); if (!access) return fail(res, 404, 'CASE_UNAVAILABLE', 'This case is unavailable or has expired.');
    if (access.session.status === 'completed') return fail(res, 409, 'ALREADY_SUBMITTED', 'An accusation has already been submitted for this play session.');
    if (!access.mystery.suspects.some((s) => s.id === body.data.suspectId)) return fail(res, 400, 'INVALID_SUSPECT', 'Select a suspect from this case.');
    const { isCorrect: correct, score } = scoreAccusation(body.data.suspectId, access.mystery.solution.culpritSuspectId);
    const culprit = access.mystery.suspects.find((s) => s.id === access.mystery.solution.culpritSuspectId);
    const result = { culpritSuspectId: culprit.id, culpritName: culprit.name, motive: access.mystery.solution.motive, explanation: access.mystery.solution.explanation, supportingEvidenceIds: access.mystery.solution.supportingEvidenceIds, alternativeSuspectExplanations: access.mystery.solution.alternativeSuspectExplanations };
    const updated = await completeSession(access.session, body.data.suspectId, body.data.reason, correct, score, result);
    if (!updated) return fail(res, 409, 'ALREADY_SUBMITTED', 'An accusation has already been submitted for this play session.');
    res.json({ data: { isCorrect: correct, selectedSuspectId: body.data.suspectId, score, result }, error: null });
  } catch (error) { next(error); }
});
app.get('/api/mysteries/:caseId/result', async (req, res, next) => {
  try { const access = await authorized(req); if (!access) return fail(res, 404, 'CASE_UNAVAILABLE', 'This case is unavailable or has expired.'); const result = await loadResult(access.session); if (!result) return fail(res, 409, 'RESULT_NOT_AVAILABLE', 'Submit an accusation before viewing the reveal.'); res.json({ data: { isCorrect: access.session.isCorrect, selectedSuspectId: access.session.selectedSuspectId, score: access.session.score, result }, error: null }); }
  catch (error) { next(error); }
});

app.use((_req, res) => fail(res, 404, 'NOT_FOUND', 'That API route could not be found. Check the path and HTTP method.'));
app.use((error, req, res, _next) => {
  const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
  const code = status === 413 ? 'REQUEST_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR';
  const message = status === 413 ? 'Request body exceeds the 24 KB limit.' : status === 400 ? 'Request body must contain valid JSON.' : 'Something went wrong. Please try again.';
  console.error(JSON.stringify({ requestId: req.requestId, event: 'request_failed', status, errorName: error?.name || 'Error' }));
  fail(res, status, code, message);
});
  return app;
}

export default createApp();
