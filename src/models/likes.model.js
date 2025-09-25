// models/likes.model.js
import mongoose, { Schema } from "mongoose";

const likesSchema = new Schema({
  video: {
    type: Schema.Types.ObjectId,
    ref: "Video",
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: "Comments",
  },
  tweet: {
    type: Schema.Types.ObjectId,
    ref: "Tweet",
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["like", "dislike"], // 👈 अब दोनो सपोर्ट करेगा
    required: true,
  },
}, { timestamps: true });

// prevent duplicate reactions (एक user एक ही बार react कर सके)
likesSchema.index({ video: 1, user: 1 }, { unique: true, partialFilterExpression: { video: { $exists: true } } });
likesSchema.index({ comment: 1, user: 1 }, { unique: true, partialFilterExpression: { comment: { $exists: true } } });
likesSchema.index({ tweet: 1, user: 1 }, { unique: true, partialFilterExpression: { tweet: { $exists: true } } });

export const Likes = mongoose.model("Likes", likesSchema);
