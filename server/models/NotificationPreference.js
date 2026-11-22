import mongoose from 'mongoose'
import { NOTIFICATION_TYPES } from '../constants/phase5Constants.js'

const { Schema } = mongoose

const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    types: {
      type: Map,
      of: Boolean,
      default: () =>
        Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type, true])),
    },
    mutedRepositories: { type: [Schema.Types.ObjectId], ref: 'Repository', default: [] },
  },
  { timestamps: true },
)

notificationPreferenceSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

export default mongoose.model('NotificationPreference', notificationPreferenceSchema)
