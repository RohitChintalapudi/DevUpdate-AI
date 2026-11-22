import mongoose from 'mongoose'
import { AI_LIMITS } from '../constants/aiConstants.js'

const { Schema } = mongoose

const citationSchema = new Schema(
  {
    id: { type: String, default: '' },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    sourceType: { type: String, default: 'OFFICIAL_DOCS' },
    excerpt: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED'],
      default: 'UNVERIFIED',
    },
  },
  { _id: false },
)

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    evidence: { type: [citationSchema], default: [] },
    insufficientEvidence: { type: Boolean, default: false },
    modelMetadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const aiConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    title: { type: String, default: 'New conversation' },
    messages: {
      type: [messageSchema],
      default: [],
      validate: {
        validator: (messages) => messages.length <= AI_LIMITS.maxMessagesPerConversation,
        message: `A conversation cannot exceed ${AI_LIMITS.maxMessagesPerConversation} messages.`,
      },
    },
  },
  { timestamps: true },
)

aiConversationSchema.index({ userId: 1, repositoryId: 1, updatedAt: -1 })

aiConversationSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('AIConversation', aiConversationSchema)
