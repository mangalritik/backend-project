// services/view.service.js
import { View } from "../models/view.model.js";
import { Video } from "../models/video.model.js";

export const handleVideoView = async ({
    videoId,
    userId = null, // logged-in user id, null for guest
    ip,
    userAgent,
    watchPercentage
}) => {
    if (!videoId || !ip) {
        return { counted: false, reason: "Missing required parameters" };
    }

    const MIN_WATCH_PERCENTAGE = 30; // min percentage to count a view
    const MIN_TIME_DIFF_MINUTES = 5; // min gap between views from same user/ip
    const now = new Date();

    // Check if the same user/IP has viewed this recently
    const existingView = await View.findOne({
        video: videoId,
        $or: [
            userId ? { user: userId } : { ip } // if user logged in, match by userId else by IP
        ]
    }).sort({ lastViewedAt: -1 });

    if (existingView) {
        const diffMinutes = (now - existingView.lastViewedAt) / (1000 * 60);

        // View recorded too soon
        if (diffMinutes < MIN_TIME_DIFF_MINUTES) {
            return { counted: false, reason: "View too soon" };
        }

        // User didn't watch enough
        if (watchPercentage < MIN_WATCH_PERCENTAGE) {
            return { counted: false, reason: "Not enough watch percentage" };
        }

        // Update existing view
        existingView.lastViewedAt = now;
        existingView.watchPercentage = watchPercentage;
        await existingView.save();

        // Increment view count
        await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

        return { counted: true, reason: "Updated existing view" };
    }

    // No existing view — create new
    if (watchPercentage >= MIN_WATCH_PERCENTAGE) {
        await View.create({
            video: videoId,
            user: userId || null,
            ip,
            userAgent,
            watchPercentage,
            lastViewedAt: now
        });

        await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

        return { counted: true, reason: "New view created" };
    }

    return { counted: false, reason: "Not enough watch percentage" };
};
