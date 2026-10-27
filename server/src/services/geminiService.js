import { GoogleGenAI } from '@google/genai';
import { validateMystery } from '../validators/mystery.js';

const promptRules = `Return one fictional mystery as JSON. Use fictional people and institutions only. Do not use real contact details or personal data. Include a fair red herring, but make the culprit determinable from visible evidence. No hidden facts may be required. Evidence titles and summaries must not name or reveal the culprit. Image-type evidence is an illustrative written description only, not a generated image. Keep all evidence and timeline entries internally consistent.`;
const string = { type: 'string' };
const stringArray = { type: 'array', items: string };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const responseSchema = object({
  title: string,
  premise: string,
  incident: string,
  difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
  suspects: { type: 'array', minItems: 3, maxItems: 5, items: object({ id: string, name: string, role: string, profile: string, possibleMotive: string, alibi: string }) },
  timeline: { type: 'array', minItems: 4, items: object({ id: string, timestamp: string, event: string, relatedSuspectIds: stringArray, relatedEvidenceIds: stringArray }) },
  evidence: { type: 'array', minItems: 6, items: object({ id: string, type: { type: 'string', enum: ['chat_transcript', 'image', 'cctv_log', 'witness_statement', 'document', 'physical_clue'] }, title: string, summary: string, content: string, timestamp: string, location: string, reliability: { type: 'string', enum: ['low', 'medium', 'high'] }, relatedSuspectIds: stringArray }) },
  solution: object({ culpritSuspectId: string, motive: string, explanation: string, supportingEvidenceIds: { type: 'array', minItems: 3, items: string }, alternativeSuspectExplanations: { type: 'array', minItems: 2, items: object({ suspectId: string, explanation: string }) } })
});

function parseJSON(raw) {
  if (typeof raw !== 'string' || raw.length > 48000) throw new Error('Generation response exceeded the configured output limit or was empty.');
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}

async function requestGeneration(client, model, contents, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await client.models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json', responseJsonSchema: responseSchema, temperature: 0.75, maxOutputTokens: 8192, abortSignal: controller.signal }
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Gemini request timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateMystery({ scenario, difficulty, category, timeoutMs, clientFactory = (apiKey) => new GoogleGenAI({ apiKey }) }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error('Gemini API key or model is not configured.');
  const client = clientFactory(apiKey);
  let repair = '';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt = `${promptRules}\nRequested difficulty: ${difficulty}\nRequested category: ${category}\nScenario: ${scenario}\n${repair}`;
    const response = await requestGeneration(client, model, prompt, timeoutMs);
    let mystery;
    try {
      mystery = parseJSON(response.text || '');
    } catch (error) {
      if (attempt === 2) throw new Error('Gemini returned malformed JSON twice.');
      repair = `Repair the previous response. It was not valid JSON (${String(error.message).slice(0, 140)}). Return the complete JSON object only.`;
      continue;
    }

    mystery.difficulty = difficulty;
    const checked = validateMystery(mystery);
    if (checked.ok) {
      return { ...checked.data, generationMetadata: { provider: 'gemini', model, schemaVersion: 1, generatedAt: new Date(), attempts: attempt } };
    }
    if (attempt === 2) throw new Error(`Gemini output failed validation: ${checked.reason}`);
    repair = `Repair the complete JSON object. Fix these validation failures: ${checked.reason}`;
  }
  throw new Error('Mystery generation failed validation.');
}
