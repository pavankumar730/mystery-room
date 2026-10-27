export const demoMystery = {
  title: 'The Last Light in the Conservatory',
  premise: 'On the night of the winter showcase, the moonstone orchid vanished from a locked glasshouse at Bellweather Conservatory.',
  incident: 'The orchid was signed into the east display at 18:00 and discovered missing at 20:10. The outer doors showed no signs of forced entry.',
  difficulty: 'medium', category: 'disappearance',
  suspects: [
    { id: 'suspect_1', name: 'Mara Venn', role: 'Night horticulturist', profile: 'Knows the glasshouse climate controls and tends the rare collection.', possibleMotive: 'Her research grant was due for renewal.', alibi: 'Says she was in the potting room preparing the closing inventory.' },
    { id: 'suspect_2', name: 'Ivo Senn', role: 'Exhibit designer', profile: 'Designed the showcase route and holds a temporary staff access card.', possibleMotive: 'An exhibition proposal he prepared had recently been declined.', alibi: 'Says he was in the public hall adjusting the final display labels.' },
    { id: 'suspect_3', name: 'Talia Rook', role: 'Volunteer guide', profile: 'Led the last public tour through the east wing.', possibleMotive: 'Wanted to impress a botanical society mentor.', alibi: 'Says she was returning visitor badges at the front desk.' },
    { id: 'suspect_4', name: 'Oren Pike', role: 'Facilities technician', profile: 'Maintains the building sensors and the service corridor.', possibleMotive: 'Had argued for replacing the old glasshouse equipment.', alibi: 'Says he was resetting a humidity sensor in the west wing.' }
  ],
  timeline: [
    { id: 'time_0', timestamp: '2026-11-14T17:42:00Z', event: 'A draft gallery note is saved to the exhibit design folder.', relatedSuspectIds: ['suspect_2'], relatedEvidenceIds: ['evidence_8'] },
    { id: 'time_1', timestamp: '2026-11-14T18:00:00Z', event: 'The moonstone orchid is logged in the east display.', relatedSuspectIds: ['suspect_1'], relatedEvidenceIds: ['evidence_1'] },
    { id: 'time_2', timestamp: '2026-11-14T18:35:00Z', event: 'The final public tour leaves the east wing.', relatedSuspectIds: ['suspect_3'], relatedEvidenceIds: ['evidence_2'] },
    { id: 'time_3', timestamp: '2026-11-14T19:05:00Z', event: 'A service door sensor records a brief opening.', relatedSuspectIds: ['suspect_4'], relatedEvidenceIds: ['evidence_3'] },
    { id: 'time_4', timestamp: '2026-11-14T19:22:00Z', event: 'A short drop in the display case humidity is recorded.', relatedSuspectIds: ['suspect_1', 'suspect_2'], relatedEvidenceIds: ['evidence_4', 'evidence_5'] },
    { id: 'time_5', timestamp: '2026-11-14T20:10:00Z', event: 'The closing inventory reports the orchid missing.', relatedSuspectIds: ['suspect_1'], relatedEvidenceIds: ['evidence_6'] }
  ],
  evidence: [
    { id: 'evidence_1', type: 'document', title: 'East display intake sheet', summary: 'The final signed inventory before the showcase.', content: 'Moonstone orchid — display E-4; seal intact at 18:00. Initials: M.V. The sheet has no later handwritten changes.', timestamp: '2026-11-14T18:00:00Z', location: 'East glasshouse', reliability: 'high', relatedSuspectIds: ['suspect_1'] },
    { id: 'evidence_2', type: 'witness_statement', title: 'Volunteer tour notes', summary: 'A guide recalls an unusual detail from the final walk-through.', content: '“I left the east wing with the visitors just before half past six. Ivo was still there, measuring the spacing between two display plinths. I did not see anyone touch the orchid case.”', timestamp: '2026-11-14T18:35:00Z', location: 'East wing', reliability: 'medium', relatedSuspectIds: ['suspect_2', 'suspect_3'] },
    { id: 'evidence_3', type: 'cctv_log', title: 'Service corridor event log', summary: 'A fictional sensor summary with a known blind spot.', content: '19:05 — service door open for 41 seconds. 19:06 — door secured. The sensor records door state only; it does not identify a person. The corridor camera was offline for maintenance.', timestamp: '2026-11-14T19:05:00Z', location: 'North service corridor', reliability: 'medium', relatedSuspectIds: ['suspect_4'] },
    { id: 'evidence_4', type: 'physical_clue', title: 'Humidity trace', summary: 'A short environmental change appears in the display log.', content: 'The case humidity dipped for 90 seconds at 19:22. A maintenance note says the case seal can be lifted from the rear for label access. No alarm was triggered.', timestamp: '2026-11-14T19:22:00Z', location: 'Display E-4', reliability: 'high', relatedSuspectIds: ['suspect_2', 'suspect_4'] },
    { id: 'evidence_5', type: 'chat_transcript', title: 'Showcase production thread', summary: 'A fictional staff exchange about last-minute display work.', content: 'Mara: “Please leave E-4 alone after the seal check.”\nIvo: “I need to straighten the rear label. Two minutes.”\nMara: “Use the side panel; don’t lift the case.”\nIvo: “Understood.”', timestamp: '2026-11-14T19:10:00Z', location: 'Staff planning thread', reliability: 'medium', relatedSuspectIds: ['suspect_1', 'suspect_2'] },
    { id: 'evidence_6', type: 'image', title: 'Closing display sketch', summary: 'An illustrative diagram recorded during the final inventory.', content: 'Illustrative scene note: the front latch appears closed, while a small fresh scuff is visible beside the rear label rail. This is a fictional description, not an authentic photograph.', timestamp: '2026-11-14T20:10:00Z', location: 'East glasshouse', reliability: 'low', relatedSuspectIds: ['suspect_1', 'suspect_2'] },
    { id: 'evidence_7', type: 'witness_statement', title: 'Potting room check-in', summary: 'A staff member places one suspect elsewhere for part of the evening.', content: '“I saw Mara sorting seed trays in the potting room from around 19:15 until the closing bell. She asked me to initial the humidity sheet when she came back.”', timestamp: '2026-11-14T19:45:00Z', location: 'Potting room', reliability: 'medium', relatedSuspectIds: ['suspect_1'] },
    { id: 'evidence_8', type: 'document', title: 'Unsent gallery correspondence', summary: 'A draft note points to a second exhibition opportunity.', content: 'Draft saved by Ivo Senn at 17:42: “Frostline Gallery passed on my showcase design, but said they may reconsider if I bring them a specimen with a story. They have not seen the moonstone orchid.” The note was not sent.', timestamp: '2026-11-14T17:42:00Z', location: 'Exhibit design folder', reliability: 'medium', relatedSuspectIds: ['suspect_2'] }
  ],
  solution: {
    culpritSuspectId: 'suspect_2', motive: 'Ivo wanted to secure a rare specimen to reopen an exhibition conversation after his showcase design was declined.',
    explanation: 'The case was accessed during the 19:22 humidity dip, consistent with someone lifting the rear panel. The production thread shows Ivo asked to work at that exact label rail and was told not to lift the case. The fresh rear scuff supports that route. The service door log is a red herring: it records no identity and is unrelated to the display access.',
    supportingEvidenceIds: ['evidence_2', 'evidence_4', 'evidence_5', 'evidence_6', 'evidence_8'],
    alternativeSuspectExplanations: [
      { suspectId: 'suspect_1', explanation: 'Mara signed the initial inventory, but the later witness places her in the potting room during the access window.' },
      { suspectId: 'suspect_3', explanation: 'Talia left with the tour before the case was accessed, and no clue places her at the rear label rail.' },
      { suspectId: 'suspect_4', explanation: 'The service door event is not tied to a person and does not explain the fresh scuff or humidity dip at E-4.' }
    ]
  },
  generationMetadata: { provider: 'demo', model: 'seeded-case', schemaVersion: 1, generatedAt: new Date(), attempts: 0 },
  status: 'ready'
};
