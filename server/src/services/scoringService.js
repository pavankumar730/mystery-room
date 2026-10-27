export function scoreAccusation(selectedSuspectId, culpritSuspectId) {
  const isCorrect = selectedSuspectId === culpritSuspectId;
  return { isCorrect, score: isCorrect ? 100 : 0 };
}
