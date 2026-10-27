import test from 'node:test';
import assert from 'node:assert/strict';
import { demoMystery } from '../src/seed/demoMystery.js';
import { generateMystery } from '../src/services/geminiService.js';

function fakeClient(responses, requests = []) {
  return {
    requests,
    models: {
      generateContent: async (request) => {
        requests.push(request);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        if (typeof response === 'function') return response(request);
        return { text: response };
      }
    }
  };
}

async function withGeminiEnv(run) {
  const oldKey = process.env.GEMINI_API_KEY;
  const oldModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_API_KEY = 'unit-test-key';
  process.env.GEMINI_MODEL = 'unit-test-model';
  try { await run(); }
  finally {
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = oldModel;
  }
}

const request = (clientFactory, overrides = {}) => generateMystery({ scenario: 'A fictional conservatory lost a rare flower during its winter showcase.', difficulty: 'hard', category: 'disappearance', timeoutMs: 1000, clientFactory, ...overrides });
const validResponse = () => JSON.stringify(demoMystery);

test('Gemini uses structured JSON output and validates the completed case', async () => withGeminiEnv(async () => {
  const client = fakeClient([validResponse()]);
  const result = await request(() => client);
  assert.equal(result.title, demoMystery.title);
  assert.equal(result.difficulty, 'hard');
  assert.equal(result.generationMetadata.attempts, 1);
  assert.equal(client.requests[0].config.responseMimeType, 'application/json');
  assert.equal(client.requests[0].config.responseJsonSchema.properties.suspects.maxItems, 5);
}));

test('malformed JSON is repaired exactly once', async () => withGeminiEnv(async () => {
  const client = fakeClient(['not json', validResponse()]);
  const result = await request(() => client);
  assert.equal(client.requests.length, 2);
  assert.equal(result.generationMetadata.attempts, 2);
  assert.match(client.requests[1].contents, /Repair the previous response/);
}));

test('business-invalid output gets one repair attempt', async () => withGeminiEnv(async () => {
  const invalid = structuredClone(demoMystery);
  invalid.solution.culpritSuspectId = 'missing_suspect';
  const client = fakeClient([JSON.stringify(invalid), validResponse()]);
  const result = await request(() => client);
  assert.equal(client.requests.length, 2);
  assert.equal(result.generationMetadata.attempts, 2);
  assert.match(client.requests[1].contents, /Culprit must reference a suspect/);
}));

test('provider failures are not retried and missing credentials fail clearly', async () => withGeminiEnv(async () => {
  const client = fakeClient([new Error('provider unavailable')]);
  await assert.rejects(request(() => client), /provider unavailable/);
  assert.equal(client.requests.length, 1);
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(request(() => assert.fail('client must not initialize')), /not configured/);
}));

test('Gemini request aborts at the configured timeout', async () => withGeminiEnv(async () => {
  const client = fakeClient([({ config }) => new Promise((_, reject) => config.abortSignal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))]);
  await assert.rejects(request(() => client, { timeoutMs: 5 }), /timed out/);
  assert.equal(client.requests.length, 1);
}));
