import { z } from 'zod';

const blockedScenario = /\b(real person|actual person|my neighbor|my coworker|my classmate|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d ()-]{8,}\d)\b/i;
export function validateScenario(input, maxLength = 1000) {
  const schema = z.object({ scenario: z.string().trim().min(30).max(maxLength), difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'), category: z.enum(['theft', 'disappearance', 'sabotage', 'mystery', 'other']).default('mystery') }).strict();
  const result = schema.safeParse(input);
  if (!result.success) return { ok: false, code: 'VALIDATION_ERROR', message: `Use a fictional scenario between 30 and ${maxLength} characters and choose supported options.` };
  if (blockedScenario.test(result.data.scenario)) return { ok: false, code: 'SCENARIO_REJECTED', message: 'Please use an entirely fictional scenario. Avoid real people, contact details, and real-world accusations.' };
  return { ok: true, data: result.data };
}
