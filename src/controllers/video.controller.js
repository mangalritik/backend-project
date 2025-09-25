
import { handleVideoView } from "../services/view.service.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getVideoDuration } from "../utils/getVideoDuration.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Likes } from "../models/likes.model.js";
import { User } from "../models/user.model.js";
import { Report } from "../models/Report.model.js";






const uploadVideo = asyncHandler(async (req, res) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILES:", req.files);

  // Check video file
  const localPath = req.files?.video?.[0]?.path;
  if (!localPath) throw new ApiError(400, "Video file is missing");

  // Extract duration
  const duration = await getVideoDuration(localPath);
  if (!duration) throw new ApiError(500, "Unable to extract video duration");

  // Upload video to Cloudinary
  const videoCloud = await uploadOnCloudinary(localPath);
  if (!videoCloud?.secure_url) throw new ApiError(500, "Video upload failed");

  // Get title & description from body (form-data)
  const { title, description } = req.body;

  // Thumbnail upload
  let thumbnail;
  if (req.files?.thumbnail?.[0]?.path) {
    const thumbnailLocalPath = req.files.thumbnail[0].path;
    const thumbnailCloud = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailCloud?.secure_url) {
      throw new ApiError(500, "Thumbnail upload failed");
    }
    thumbnail = thumbnailCloud.secure_url;
  }

  // Validate required fields
  if (!title || !description || !thumbnail) {
    throw new ApiError(400, "Title, description, and thumbnail are required");
  }

  // Save to DB
  const video = await Video.create({
    video: videoCloud.secure_url,
    thumbnail,
    title,
    description,
    duration,
    owner: req.user._id // make sure req.user is set by auth middleware
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







const toggleLikeOnVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user._id;

        // 1. Check video existence
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        // 2. Check if already liked
        const existingLike = await Like.findOne({ video: videoId, user: userId });

        if (existingLike) {
            // 👉 Unlike
            await Like.deleteOne({ _id: existingLike._id });

            const totalLikes = await Like.countDocuments({ video: videoId });
            return res.status(200).json({
                success: true,
                message: "Video unliked successfully",
                liked: false,
                totalLikes
            });
        } else {
            // 👉 Like
            await Like.create({ video: videoId, user: userId });

            const totalLikes = await Like.countDocuments({ video: videoId });
            return res.status(200).json({
                success: true,
                message: "Video liked successfully",
                liked: true,
                totalLikes
            });
        }

    } catch (error) {
        console.error("Error toggling like on video:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};







const toggleDislikeOnVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user._id;

        // 1. Check if video exists
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found",
            });
        }

        // 2. Check if user already disliked
        const existingDislike = await Likes.findOne({
            video: videoId,
            user: userId,
            type: "dislike",
        });

        if (existingDislike) {
            // 👉 Remove Dislike (toggle off)
            await Likes.deleteOne({ _id: existingDislike._id });

            const totalLikes = await Likes.countDocuments({ video: videoId, type: "like" });
            const totalDislikes = await Likes.countDocuments({ video: videoId, type: "dislike" });

            return res.status(200).json({
                success: true,
                message: "Dislike removed successfully",
                disliked: false,
                totalLikes,
                totalDislikes,
            });
        }

        // 3. Remove like if exists (user can't like & dislike same video simultaneously)
        await Likes.deleteOne({ video: videoId, user: userId, type: "like" });

        // 4. Add new dislike
        await Likes.create({ video: videoId, user: userId, type: "dislike" });

        const totalLikes = await Likes.countDocuments({ video: videoId, type: "like" });
        const totalDislikes = await Likes.countDocuments({ video: videoId, type: "dislike" });

        return res.status(200).json({
            success: true,
            message: "Video disliked successfully",
            disliked: true,
            totalLikes,
            totalDislikes,
        });

    } catch (error) {
        console.error("Error toggling dislike on video:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};







const getRelatedVideos = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id; // optional, if user is logged in
    const { page = 1, limit = 10 } = req.query;

    // 1. Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // 2. Get user's watch history if logged in
    let watchedVideoIds = [];
    if (userId) {
      const user = await User.findById(userId).select("watchHistory");
      watchedVideoIds = user?.watchHistory.map((id) => id.toString()) || [];
    }

    // 3. Build query for related videos
    const query = {
      _id: { $ne: videoId },        // exclude current video
      isPublished: true,
      $or: [
        { tags: { $in: video.tags } },
        { category: video.category },
        { owner: video.owner },
      ],
      _id: { $nin: watchedVideoIds }, // prioritize videos user hasn't watched
    };

    // 4. Fetch related videos
    const relatedVideos = await Video.find(query)
      .populate("owner", "username avatar")
      .select("title thumbnail views createdAt duration")
      .sort({ views: -1, createdAt: -1 }) // popular + recent
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalRelated = await Video.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Related videos fetched successfully",
      pagination: {
        total: totalRelated,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRelated / limit),
      },
      relatedVideos,
    });
  } catch (error) {
    console.error("Error fetching related videos:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};







const getWatchLaterVideos = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 1. Fetch user's watchLater list
    const user = await User.findById(userId).select("watchLater");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Filter only published videos
    const videosQuery = Video.find({
      _id: { $in: user.watchLater },
      isPublished: true,
    })
      .populate("owner", "username avatar")
      .select("title thumbnail views duration createdAt")
      .sort({ createdAt: -1 }) // latest added first
      .skip((page - 1) * limit)
      .limit(limit);

    const videos = await videosQuery.exec();

    // 3. Total videos count
    const totalVideos = await Video.countDocuments({
      _id: { $in: user.watchLater },
      isPublished: true,
    });

    // 4. Total duration calculation
    const totalDuration = videos.reduce((acc, video) => acc + (video.duration || 0), 0);

    return res.status(200).json({
      success: true,
      message: "Watch Later videos fetched successfully",
      pagination: {
        totalVideos,
        page,
        limit,
        totalPages: Math.ceil(totalVideos / limit),
      },
      totalDuration,
      videos,
    });
  } catch (error) {
    console.error("Error fetching Watch Later videos:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};







const reportVideo = async (req, res) => {
  try {
    const userId = req.user._id;
    const { videoId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid reason (min 5 characters)",
      });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check if already reported
    const existingReport = await Report.findOne({
      targetId: videoId,
      reportedBy: userId,
      type: "video",
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this video",
      });
    }

    // Create report
    const report = await Report.create({
      type: "video",
      typeRef: "Video",
      targetId: videoId,
      reportedBy: userId,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Video reported successfully",
      report,
    });
  } catch (error) {
    console.error("Error reporting video:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
    searchVideos,
    toggleLikeOnVideo,
    toggleDislikeOnVideo,
    getRelatedVideos,
    getWatchLaterVideos,
    reportVideo
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

