import mongoose from 'mongoose'

const { Schema } = mongoose

const githubConnectionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    githubUserId: { type: Number, default: null },
    githubUsername: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    installationId: { type: Number, required: true, unique: true, index: true },
    installationUrl: { type: String, default: '' },
    connectedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'EXPIRED', 'FAILED'],
      default: 'CONNECTED',
    },
  },
  { timestamps: true },
)

githubConnectionSchema.index({ userId: 1, status: 1 })

githubConnectionSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('GitHubConnection', githubConnectionSchema)
