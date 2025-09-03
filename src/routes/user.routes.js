import { Router} from "express"
import { loginUser, logoutUser, registerUser,refreshAccessToken , 
    changeCurrentPassword,getCurrentUser , updateAccountDetails , updateUserAvatar,updateUserCoverImage,
    getWatchHistory,
    addToWatchHistory} from "../controllers/user.controller.js"
import { upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { get } from "https"


const router = Router()

router.route("/register").post(
    upload.fields([
{
    name: "avatar",
    maxCount:1
},
{
name:"coverImage",
maxCount:1
}
    ]),
    registerUser
)


router.route("/login").post(loginUser)

// secure routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/changepassword").post(verifyJWT, changeCurrentPassword);
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);
router.route("/updateAccountDetails").post(verifyJWT, updateAccountDetails);
router.route("/updateUserAvatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/updateUserCoverImage").patch(verifyJWT, upload.single("CoverImage"), updateUserCoverImage);
router.route("/addWatchHistory").post(verifyJWT, addToWatchHistory);
router.route("/getWatchHistory").get(verifyJWT, getWatchHistory);

export default router
