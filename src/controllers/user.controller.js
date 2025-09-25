import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import {Video} from "../models/video.model.js"
import mongoose from "mongoose";
import { handleVideoView } from "../services/view.service.js";
import { Comments } from "../models/comments.modal.js";
import { PlayList } from "../models/playList.model.js";
import { subscription} from "../models/subscription.modal.js";

// import { populate } from "dotenv";
// import { View } from "../models/view.model.js";


// Function to generate access and refresh tokens for a user
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

// Function to register a new user
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.
        coverImage)
        && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// Function to login a user
const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

// Function to logout a user
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined,
        }
    }, {
        new: true,
    });

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});




const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
    // = req.cookies.
        // refreshToken || req.body.refreshToken
        req.cookies.refreshToken || req.body.refreshToken


    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")

    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFERESH_TOKEN_SECRET
     )
     const user = await User.findById(decodedToken?._id)
     if (!user) {
         throw new ApiError(401, "Invalid refresh Token")
 
     }
     if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "refresh Token is expire or used")
 
     }
 
     const option ={
         httpOnly: true,
         secure: true,
     }
     const {accessToken,newrefreshToken}=
     await generateAccessAndRefreshToken(user._id)
 
     return res 
     .status(200)
     .cookie("accessToken",accessToken,option)
     .cookie("refreshToken",newrefreshToken,option)
     .json(
         new ApiResponse(
             200,
             {accessToken,refreshToken:newrefreshToken},
             "Access token refreshed"
         )
     )
   } catch (error) {
    throw new ApiError(401,error?.message||"invalid refresh token")
   }
}) 


const changeCurrentPassword= asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
   
    const user=await User.findById(req.user._id)
      if (!user) {
        throw new ApiError(404, "User not found");
    }
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    
    if (!isPasswordCorrect) {
    
        throw new ApiError(400,"invalid old password")
    }
    user.password=newPassword
   await user.save({validateBeforeSave:false})


   return res 
   .status(200)
   .json(
       new ApiResponse(
           200,
           {},
           "password change successfully"
       )
   )
})



const getCurrentUser = asyncHandler(async(req,res)=>{
    return res 
    .status(200)
   .json(
        new ApiResponse(
            200,req.user,"current user fetched successfully"
        )
    )
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body
    if (!fullName || !email) {
        throw new ApiError(400,"All fields require")
    }
  const user = await User.findByIdAndUpdate(req.user?._id,{
    $set:{
        fullName:fullName,
        email: email
    }
  },
{
    new: true
}).select("-password")
return res 
    .status(200)
   .json(
        new ApiResponse(
            200,user,"Account details"
        )
    )

})



const updateUserAvatar = asyncHandler(async(req,res)=>{
 const avatarLocalPath = req.file?.path

 if (!avatarLocalPath) {
    throw new ApiError(400,"Avatar file is missing");
    
 }

 const avatar = await uploadOnCloudinary(avatarLocalPath)
  if (!avatar.url) {
    throw new ApiError(400, " Error while uploading on avator")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,{
        $set:{
            avatar:avatar.url
            }
    },
    {
        new: true
        }

  ).select("-password");
  
    if (!User) {
        throw new ApiError(404, "User not found");
    }
  return res
  .status(200)
  .json(new ApiResponse(200,user,"User avatar updated successfully",user)
  )
}
)


const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const CoverImageLocalPath = req.file?.path
   console.log(CoverImageLocalPath)
    if (!CoverImageLocalPath) {
       throw new ApiError(400,"CoverImage file is missing");
       
    }
   
    const CoverImage = await uploadOnCloudinary(CoverImageLocalPath)
     if (!CoverImage.url) {
       throw new ApiError(400, " Error while uploading on CoverImage")
     }
   
    const user= await User.findByIdAndUpdate(
       req.user?._id,{
           $set:{
            coverImage:CoverImage.url
               }
       },
       {
           new: true
           }
   
     ).select("-password")
      if (!User) {
        throw new ApiError(404, "User not found");
    }
     return res
     .status(200)
     .json (new ApiResponse(200,user,"User CoverImage updated successfully",user)
)}
   )
   


const addToWatchHistory = async (req, res) => {
    try {
        const { videoId, watchPercentage } = req.body;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const userId = req.user ? req.user._id : null;

        const result = await handleVideoView({
            videoId,
            userId,
            ip,
            userAgent,
            watchPercentage
        });

        // Only add to watch history if user is logged in
        if (userId) {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { watchHistory: videoId }
            });
        }

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



const getWatchHistory = asyncHandler(async (req, res) => {
    // 1️⃣ Find user and get watchHistory array (most recent first assumption)
    const user = await User.findById(req.user._id).select("watchHistory");

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    // If watchHistory is stored in order of watching, we reverse it to show last watched first
    const videoIds = [...user.watchHistory].reverse();

    // 2️⃣ Fetch videos in the same order
    const videos = await Video.find({ _id: { $in: videoIds } })
        .populate("owner", "username fullName avatar")
        .lean();

    // 3️⃣ Preserve the original order of watchHistory
    const orderedVideos = videoIds.map(id => videos.find(v => v._id.toString() === id.toString()));

    res.status(200).json({
        success: true,
        count: orderedVideos.length,
        watchHistory: orderedVideos
    });
});




const deleteAccount = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user._id;

        // 1. Check if user exists
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // 2. Delete related data
        await Video.deleteMany({ owner: userId }).session(session);
        await Comments.deleteMany({ owner: userId }).session(session);
        await PlayList.deleteMany({ owner: userId }).session(session);
        await subscription.deleteMany({
            $or: [{ subscriber: userId }, { channel: userId }]
        }).session(session);

        // 3. Delete user itself
        await User.findByIdAndDelete(userId).session(session);

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Account and related data deleted successfully"
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error deleting account:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




const getUserChannel = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query; // pagination support
        const skip = (page - 1) * limit;

        // 1. Get channel (User details without password)
        const channel = await User.findById(userId)
            .select("_id username email avatar coverImage createdAt");
        if (!channel) {
            return res.status(404).json({
                success: false,
                message: "Channel not found"
            });
        }

        // 2. Subscribers & SubscribedTo count (aggregation for performance)
        const [stats] = await Subscription.aggregate([
            {
                $facet: {
                    subscribersCount: [
                        { $match: { channel: channel._id } },
                        { $count: "count" }
                    ],
                    subscribedToCount: [
                        { $match: { subscriber: channel._id } },
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const subscribersCount = stats.subscribersCount[0]?.count || 0;
        const subscribedToCount = stats.subscribedToCount[0]?.count || 0;

        // 3. Is current user subscribed?
        let isSubscribed = false;
        if (req.user) {
            const sub = await Subscription.findOne({
                subscriber: req.user._id,
                channel: channel._id
            });
            isSubscribed = !!sub;
        }

        // 4. Videos (pagination + selective fields)
        const videos = await Video.find({ owner: channel._id })
            .select("_id title thumbnail views createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // 5. Total videos count (for frontend pagination)
        const totalVideos = await Video.countDocuments({ owner: channel._id });

        return res.status(200).json({
            success: true,
            channel: {
                ...channel.toObject(),
                subscribersCount,
                subscribedToCount,
                isSubscribed
            },
            videos,
            pagination: {
                totalVideos,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalVideos / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching channel:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




const getUserSubscribers = async (req, res) => {
    try {
        const { userId } = req.params; // जिस channel के subscribers चाहिए
        const requesterId = req.user?._id?.toString(); // logged-in user id
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // 1. Channel existence check
        const channel = await User.findById(userId).select("_id username avatar");
        if (!channel) {
            return res.status(404).json({
                success: false,
                message: "Channel not found"
            });
        }

        // 2. Aggregation for count + subscribers
        const pipeline = [
            { $match: { channel: channel._id } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    subscribers: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: parseInt(limit) },
                        {
                            $lookup: {
                                from: "users",
                                localField: "subscriber",
                                foreignField: "_id",
                                as: "subscriber"
                            }
                        },
                        { $unwind: "$subscriber" },
                        {
                            $project: {
                                _id: "$subscriber._id",
                                username: "$subscriber.username",
                                avatar: "$subscriber.avatar",
                                subscribedAt: "$createdAt"
                            }
                        }
                    ]
                }
            }
        ];

        const [result] = await Subscription.aggregate(pipeline);
        const totalSubscribers = result.totalCount[0]?.count || 0;

        // 3. If owner → return list + count (with pagination)
        if (requesterId === userId.toString()) {
            return res.status(200).json({
                success: true,
                channel: {
                    _id: channel._id,
                    username: channel.username,
                    avatar: channel.avatar
                },
                totalSubscribers,
                subscribers: result.subscribers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalSubscribers / limit)
                }
            });
        }

        // 4. If other → only count
        return res.status(200).json({
            success: true,
            channel: {
                _id: channel._id,
                username: channel.username,
                avatar: channel.avatar
            },
            totalSubscribers
        });

    } catch (error) {
        console.error("Error fetching subscribers:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};






const getSubscribedChannels = async (req, res) => {
    try {
        const { userId } = req.params; // जिस user के subscriptions देख रहे हैं
        const requesterId = req.user?._id?.toString(); // logged-in user
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // 1. User existence check
        const user = await User.findById(userId).select("_id username avatar");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // 2. Aggregate total count + channels list
        const pipeline = [
            { $match: { subscriber: user._id } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    channels: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: parseInt(limit) },
                        {
                            $lookup: {
                                from: "users",
                                localField: "channel",
                                foreignField: "_id",
                                as: "channel"
                            }
                        },
                        { $unwind: "$channel" },
                        {
                            $project: {
                                _id: "$channel._id",
                                username: "$channel.username",
                                avatar: "$channel.avatar",
                                subscribedAt: "$createdAt"
                            }
                        }
                    ]
                }
            }
        ];

        const [result] = await Subscription.aggregate(pipeline);
        const totalSubscribedChannels = result.totalCount[0]?.count || 0;

        // 3. If owner → return full list + count
        if (requesterId === userId.toString()) {
            return res.status(200).json({
                success: true,
                user: {
                    _id: user._id,
                    username: user.username,
                    avatar: user.avatar
                },
                totalSubscribedChannels,
                channels: result.channels,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalSubscribedChannels / limit)
                }
            });
        }

        // 4. If other → return only count
        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                avatar: user.avatar
            },
            totalSubscribedChannels
        });

    } catch (error) {
        console.error("Error fetching subscribed channels:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};





export { 
registerUser,
loginUser,
logoutUser,
refreshAccessToken,
changeCurrentPassword,
getCurrentUser,
updateAccountDetails,
updateUserAvatar,
updateUserCoverImage,
addToWatchHistory,
getWatchHistory,
deleteAccount,
getUserChannel,
getUserSubscribers,
getSubscribedChannels
};

