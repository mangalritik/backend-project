// models/view.model.js
import mongoose from "mongoose";

const viewSchema = new mongoose.Schema({
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false // guest user bhi dekh sakta hai
    },
    ip: { type: String, required: true },
    userAgent: { type: String },
    lastViewedAt: { type: Date, default: Date.now },
    watchPercentage: { type: Number, default: 0 } // % of video watched
}, { timestamps: true });

// Capitalized model name
export const View = mongoose.model("View", viewSchema);
