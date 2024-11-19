import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from  "../utils/ApiResponse.js"
const registerUser = asyncHandler ( async (req,res)=> {
    // res.status(200).json({
    //     message:"jai shree shyam"
    // })

   const {fullName,email,username,password} = req.body

   console.log("email",email)
   if (
    [fullName,email,username,password].some((field)=> 
    field?.trim()==="")
   ) {
    throw new ApiError(400,"All fields are required")
   }
const existedUser = User.findOne({
    $or: [{username}, {email}]
})
if (existedUser) {
    throw new ApiError(409, "user with email or username alread exist")
}

const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage[0]?.path

if (!avatarLocalPath) {
    throw new ApiError (400, "Avatar file is required")
}
 
const Avatar = await uploadOnCloudinary(avatarLocalPath)
const  coverImage =await  uploadOnCloudinary(coverImageLocalPath)

if (!Avatar) {
    throw new ApiError (400, "Avatar file is required")

}

const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()

})
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

if (!createdUser) {
    throw new ApiError(500,"Something Went wrong while registring the user")
}

return res.status(201).json(
    new ApiResponse(200,createdUser, " user register successfully")
)

})
 

export {registerUser} 