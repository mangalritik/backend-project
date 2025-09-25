// models/report.model.js
import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["video", "comment", "tweet", "playlist"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "typeRef",
    },
    typeRef: {
      type: String,
      required: true,
      enum: ["Video", "Comments", "Tweet", "Playlist"], // Mongoose ref mapping
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Report = mongoose.model("Report", reportSchema);
