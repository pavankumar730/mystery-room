import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({ id: String, name: String, role: String, profile: String, possibleMotive: String, alibi: String }, { _id: false });
const mysterySchema = new mongoose.Schema({
  schemaVersion: { type: Number, default: 1 }, title: String, originalScenario: String, premise: String, incident: String,
  difficulty: String, category: String, suspects: [suspectSchema], timeline: [mongoose.Schema.Types.Mixed], evidence: [mongoose.Schema.Types.Mixed],
  solution: mongoose.Schema.Types.Mixed, generationMetadata: mongoose.Schema.Types.Mixed, status: String, expiresAt: Date
}, { timestamps: true });
mysterySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const sessionSchema = new mongoose.Schema({
  mysteryId: { type: mongoose.Schema.Types.ObjectId, index: true }, sessionTokenHash: { type: String, index: true },
  status: { type: String, default: 'in_progress' }, selectedSuspectId: String, submittedReason: String, isCorrect: Boolean, score: Number, result: mongoose.Schema.Types.Mixed,
  startedAt: { type: Date, default: Date.now }, submittedAt: Date, expiresAt: Date
});
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Mystery = mongoose.models.Mystery || mongoose.model('Mystery', mysterySchema);
export const PlaySession = mongoose.models.PlaySession || mongoose.model('PlaySession', sessionSchema);
