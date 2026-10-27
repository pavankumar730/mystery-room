import test from 'node:test';
import assert from 'node:assert/strict';
import app, { createApp } from '../src/app.js';
import { safeCase } from '../src/validators/mystery.js';

test('demo case is session-private and only reveals its solution after one accusation', async (t) => {
  globalThis.mongoReady = false;
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const root = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(root.status, 200);
  assert.equal((await root.json()).data.health, '/api/health');
  const health = await fetch(`${base}/health`);
  assert.equal((await health.json()).data.mode, 'demo');
  const missing = await fetch(`${base}/missing-route`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'NOT_FOUND');

  const malformed = await fetch(`${base}/mysteries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{invalid json' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
  const createUnavailable = await fetch(`${base}/mysteries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: 'A fictional museum incident with a missing clock after a private gala.' }) });
  assert.equal(createUnavailable.status, 503);
  assert.equal((await createUnavailable.json()).error.code, 'PERSISTENCE_UNAVAILABLE');

  const openDemo = async () => {
    const response = await fetch(`${base}/mysteries/demo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    return { cookie, body: await response.json() };
  };
  const first = await openDemo();
  const caseId = first.body.data.caseId;
  const safeJSON = JSON.stringify(first.body.data.case);
  assert.equal(safeJSON.includes('culpritSuspectId'), false);
  assert.equal(safeJSON.includes('solution'), false);

  const caseResponse = await fetch(`${base}/mysteries/${caseId}`, { headers: { cookie: first.cookie } });
  assert.equal(caseResponse.status, 200);
  const loadedCase = await caseResponse.json();
  assert.equal(JSON.stringify(loadedCase).includes('culpritSuspectId'), false);
  assert.equal(loadedCase.data.demo, true);
  const firstCaseData = loadedCase.data;
  const evidenceResponse = await fetch(`${base}/mysteries/${caseId}/evidence/${firstCaseData.evidence[0].id}`, { headers: { cookie: first.cookie } });
  assert.equal(evidenceResponse.status, 200);
  const prematureResult = await fetch(`${base}/mysteries/${caseId}/result`, { headers: { cookie: first.cookie } });
  assert.equal(prematureResult.status, 409);

  const second = await openDemo();
  const unauthorized = await fetch(`${base}/mysteries/${caseId}`, { headers: { cookie: second.cookie } });
  assert.equal(unauthorized.status, 404);
  const correctAccusation = await fetch(`${base}/mysteries/${second.body.data.caseId}/accusation`, { method: 'POST', headers: { cookie: second.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: 'suspect_2' }) });
  assert.equal(correctAccusation.status, 200);
  const correctResult = await correctAccusation.json();
  assert.equal(correctResult.data.isCorrect, true);
  assert.equal(correctResult.data.score, 100);
  const invalidSuspect = await fetch(`${base}/mysteries/${caseId}/accusation`, { method: 'POST', headers: { cookie: first.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: 'not_in_case' }) });
  assert.equal(invalidSuspect.status, 400);

  const accusation = await fetch(`${base}/mysteries/${caseId}/accusation`, { method: 'POST', headers: { cookie: first.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: 'suspect_1', reason: 'The inventory timing matters.' }) });
  assert.equal(accusation.status, 200);
  const result = await accusation.json();
  assert.equal(result.data.isCorrect, false);
  assert.equal(result.data.score, 0);
  assert.equal(result.data.result.culpritSuspectId, 'suspect_2');

  const duplicate = await fetch(`${base}/mysteries/${caseId}/accusation`, { method: 'POST', headers: { cookie: first.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: 'suspect_2' }) });
  assert.equal(duplicate.status, 409);
  const savedResult = await fetch(`${base}/mysteries/${caseId}/result`, { headers: { cookie: first.cookie } });
  assert.equal(savedResult.status, 200);

  const replay = await fetch(`${base}/mysteries/${second.body.data.caseId}/replay`, { method: 'POST', headers: { cookie: second.cookie } });
  assert.equal(replay.status, 200);
  const replayCookie = replay.headers.get('set-cookie').split(';')[0];
  const replayAccusation = await fetch(`${base}/mysteries/${second.body.data.caseId}/accusation`, { method: 'POST', headers: { cookie: replayCookie, 'content-type': 'application/json' }, body: JSON.stringify({ suspectId: 'suspect_1' }) });
  assert.equal(replayAccusation.status, 200);
  assert.equal((await replayAccusation.json()).data.score, 0);

  globalThis.mongoReady = true;
  const malformedObjectId = await fetch(`${base}/mysteries/not-an-object-id`, { headers: { cookie: first.cookie } });
  assert.equal(malformedObjectId.status, 404);
  globalThis.mongoReady = false;
});

test('generation failure returns the validated sample case without exposing its solution', async (t) => {
  const logs = [];
  const originalError = console.error;
  console.error = (message) => logs.push(String(message));
  const fallbackApp = createApp({
    persistenceReady: () => true,
    generate: async () => { throw new Error('Gemini request timed out.'); },
    createSessionCase: async (mystery, _response, { demo }) => ({
      caseId: 'sample-case-id',
      case: { ...safeCase(mystery, 'sample-case-id'), demo }
    })
  });
  const server = fallbackApp.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    console.error = originalError;
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/mysteries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario: 'A fictional observatory loses a signed lunar chart during its winter open night.', difficulty: 'medium', category: 'mystery' })
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.data.fallback, true);
  assert.equal(body.data.case.demo, true);
  assert.equal(body.data.case.generationMetadata.provider, 'demo');
  assert.ok(body.data.case.suspects.length >= 3);
  assert.ok(body.data.case.evidence.length >= 6);
  assert.equal(Object.hasOwn(body.data.case, 'solution'), false);
  assert.equal(JSON.stringify(body.data.case).includes('culpritSuspectId'), false);
  assert.match(logs[0], /Gemini request timed out/);
});
