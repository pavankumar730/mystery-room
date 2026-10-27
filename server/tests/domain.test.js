import test from 'node:test';
import assert from 'node:assert/strict';
import { demoMystery } from '../src/seed/demoMystery.js';
import { safeCase, validateMystery } from '../src/validators/mystery.js';
import { scoreAccusation } from '../src/services/scoringService.js';
import { validateScenario } from '../src/validators/scenario.js';

test('seeded demo satisfies the playable mystery contract', () => {
  const result = validateMystery(demoMystery);
  assert.equal(result.ok, true, result.reason);
  assert.equal(demoMystery.suspects.length >= 3 && demoMystery.suspects.length <= 5, true);
  assert.ok(demoMystery.evidence.length >= 6);
  assert.ok(new Set(demoMystery.evidence.map((item) => item.type)).size >= 3);
  assert.ok(demoMystery.timeline.length >= 4);
});

test('mystery validation rejects dangling culprit and evidence references', () => {
  const badCulprit = structuredClone(demoMystery);
  badCulprit.solution.culpritSuspectId = 'missing_suspect';
  assert.equal(validateMystery(badCulprit).ok, false);
  const badEvidence = structuredClone(demoMystery);
  badEvidence.solution.supportingEvidenceIds[0] = 'missing_evidence';
  assert.equal(validateMystery(badEvidence).ok, false);
});

test('player serialization excludes the private answer key', () => {
  const view = safeCase({ ...demoMystery, expiresAt: new Date() }, 'case_123');
  assert.equal('solution' in view, false);
  assert.equal('expiresAt' in view, false);
  assert.equal(JSON.stringify(view).includes('culpritSuspectId'), false);
  assert.equal(JSON.stringify(view).includes(demoMystery.solution.motive), false);
  assert.equal(view.caseId, 'case_123');
});

test('score is deterministic and based only on the selected suspect', () => {
  assert.deepEqual(scoreAccusation('suspect_2', 'suspect_2'), { isCorrect: true, score: 100 });
  assert.deepEqual(scoreAccusation('suspect_1', 'suspect_2'), { isCorrect: false, score: 0 });
});

test('scenario validation enforces length, allowed options, and fictional framing', () => {
  assert.equal(validateScenario({ scenario: 'too short' }).ok, false);
  assert.equal(validateScenario({ scenario: 'A fictional museum incident with a missing clock after a private gala.' }).ok, true);
  assert.equal(validateScenario({ scenario: 'A real person stole a rare item from the local museum during the weekend.' }).code, 'SCENARIO_REJECTED');
  assert.equal(validateScenario({ scenario: `${'A'.repeat(1001)}` }).ok, false);
});
