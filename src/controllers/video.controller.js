import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getVideoDuration } from "../utils/getVideoDuration.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const uploadVideo = asyncHandler(async (req, res) => {
    const localPath = req.files?.video?.[0]?.path;
    if (!localPath) throw new ApiError(400, "Video file is missing");

    // Extract duration
    const duration = await getVideoDuration(localPath);
    if (!duration) throw new ApiError(500, "Unable to extract video duration");

    // Upload to Cloudinary
    const videoCloud = await uploadOnCloudinary(localPath);
    if (!videoCloud?.secure_url) throw new ApiError(500, "Video upload failed");

    // Get data from body
    let { title, description } = req.body;
    let thumbnail = req.body.thumbnail; 

    if (req.files?.thumbnail?.[0]?.path) {
        const thumbnailLocalPath = req.files.thumbnail[0].path;
        const thumbnailCloud = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnailCloud?.secure_url) {
            throw new ApiError(500, "Thumbnail upload failed");
        }
        thumbnail = thumbnailCloud.secure_url;
    }


    if (!title || !description || !thumbnail) {
        throw new ApiError(400, "Title, description, and thumbnail URL are required");
    }

    // Save to DB
    const video = await Video.create({
        video:videoCloud.secure_url ,
        thumbnail,
        title,
        description,
        duration,
        owner: req.user._id
    });

    res.status(201).json({
        success: true,
        message: "Video uploaded successfully",
        data: video
    });
});



const getVideoById = asyncHandler(async (req, res) => {
    const videoId = req.query.videoId || req.body.videoId; // query ya body dono me chalega
    console.log("Video ID:", videoId);

    if (!videoId) {
        return res.status(400).json({
            success: false,
            message: "Video ID is required"
        });
    }

    // Find video with owner details
    const video = await Video.findById(videoId)
        .populate("owner", "username email avatar");

    if (!video) {
        return res.status(404).json({
            success: false,
            message: "Video not found"
        });
    }

    // Increment views count
    video.views += 1;
    await video.save();

    res.status(200).json({
        success: true,
        message: "Video fetched successfully",
        data: video
    });
});



const getAllVideos = asyncHandler(async (req, res) => {
    // Query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch videos
    const videos = await Video.find()
        .populate("owner", "username email avatar") // Only these fields
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit);

    // Total video count
    const totalVideos = await Video.countDocuments();

    res.status(200).json({
        success: true,
        message: "Videos fetched successfully",
        data: {
            videos,
            pagination: {
                totalVideos,
                currentPage: page,
                totalPages: Math.ceil(totalVideos / limit)
            }
        }
    });
});




const updateVideo = async (req, res) => {
    const { videoId, title, description, thumbnail } = req.query;
console.log(req.query)
    if (!videoId) {
        return res.status(400).json({
            success: false,
            message: "Video ID is required"
        });
    }

    const video = await Video.findById(videoId);

    if (!video) {
        return res.status(404).json({
            success: false,
            message: "Video not found"
        });
    }

    // Ownership check
    if (video.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: "You are not allowed to update this video"
        });
    }

    // Update fields from query params
    if (title) video.title = title;
    if (description) video.description = description;
    if (thumbnail) video.thumbnail = thumbnail;

    await video.save();

    res.status(200).json({
        success: true,
        message: "Video updated successfully",
        data: video
    });
};






const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.query; // Query se videoId fetch

    // Agar videoId nahi mila
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Video ID is required",
      });
    }

    // Video delete karo
    const deletedVideo = await Video.findByIdAndDelete(videoId);

    // Agar video exist nahi karta
    if (!deletedVideo) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      data: deletedVideo,
    });

  } catch (error) {
    console.error("Error deleting video:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the video",
      error: error.message,
    });
  }
};



const togglePublishStatus = async (req, res) => {
  try {
    const { videoId } = req.query; // Query params se videoId

    // Agar videoId nahi mila
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Video ID is required",
      });
    }

    // Video find karo
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Status toggle karo
    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json({
      success: true,
      message: `Video publish status updated to ${video.isPublished}`,
      data: video,
    });

  } catch (error) {
    console.error("Error toggling publish status:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating publish status",
      error: error.message,
    });
  }
};






const getVideosByUser = asyncHandler(async (req, res) => {
    const { userId } = req.query; // Query se userId fetch

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "User ID is required"
        });
    }

    // Get all videos by user
    const videos = await Video.find({ owner: userId })
        .populate("owner", "username email avatar") // Optional: user details include
        .sort({ createdAt: -1 }); // Latest first

    if (!videos || videos.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No videos found for this user"
        });
    }

    res.status(200).json({
        success: true,
        message: "Videos fetched successfully",
        data: videos
    });
});





const getTrendingVideos = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10; // Kitne videos chahiye (default: 10)

    // Find videos sorted by views (descending)
    const trendingVideos = await Video.find()
        .sort({ views: -1, createdAt: -1 }) // Highest views first, then latest
        .limit(limit)
        .populate("owner", "username email avatar"); // Optional: include owner details

    if (!trendingVideos || trendingVideos.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No trending videos found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Trending videos fetched successfully",
        data: trendingVideos
    });
});






// controllers/video.controller.js
import { handleVideoView } from "../services/view.service.js";

const incrementVideoViews = async (req, res) => {
    try {
        const videoId = req.query.videoId; // URL से video id
        const userId = req.user?._id || null; // JWT auth से user id, guest के लिए null
        const ip = req.ip; // Client IP
        const userAgent = req.get("User-Agent"); // Browser info
        const watchPercentage = req.body.watchPercentage || 100; // कितनी % देखी

        const result = await handleVideoView({
            videoId,
            userId,
            ip,
            userAgent,
            watchPercentage
        });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Error incrementing views:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};









const searchVideos = async (req, res) => {
    try {
        const { query, limit = 10, page = 1 } = req.query;

        if (!query || query.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const skip = (page - 1) * parseInt(limit);

        const videos = await Video.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails"
            },
            {
                $match: {
                    $or: [
                        { title: { $regex: query, $options: "i" } }, // video name search
                        { "ownerDetails.username": { $regex: query, $options: "i" } } // user name search
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: parseInt(limit)
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    createdAt: 1,
                    "ownerDetails._id": 1,
                    "ownerDetails.username": 1,
                    "ownerDetails.avatar": 1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            results: videos
        });
    } catch (error) {
        console.error("Error searching videos:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};





export { 
    uploadVideo ,
    getVideoById,
    getAllVideos,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getVideosByUser,
    getTrendingVideos,
    incrementVideoViews ,
    searchVideos
};




// Video Controllers List
// Upload / Create Video
// Video ka URL (Cloudinary), thumbnail, title, description, duration etc. save karega.
// Example: uploadVideo(req, res)
// Get Single Video by ID
// GET /videos/:id
// Ek specific video ka data fetch karega.
// Get All Videos (with pagination, filtering, searching)
// GET /videos
// Title search, owner filter, sort by views/date, etc.
// Update Video Details
// PATCH /videos/:id
// Title, description, thumbnail, publish status update karega.
// Delete Video
// DELETE /videos/:id
// Video ko DB se delete karega (Cloudinary se bhi agar chahen).
// Toggle Publish Status
// Draft mode ↔ Published mode change karna.
// Increment View Count
// Video dekhte waqt views +1 karna (ye addToWatchHistory me already cover ho sakta hai).
// Get Videos by User (Owner)
// GET /users/:id/videos
// Specific user ke saare videos fetch karna.
// Get Trending Videos
// Views ke hisaab se top videos laana.
// Like / Unlike Video (Agar likes ka system add karte ho)
// Likes ko toggle karega aur user ke liked videos list update karega.

