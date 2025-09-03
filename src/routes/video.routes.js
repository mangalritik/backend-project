import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import { deleteVideo, getAllVideos, getTrendingVideos, getVideoById, getVideosByUser, incrementVideoViews, searchVideos, togglePublishStatus, updateVideo, uploadVideo } from "../controllers/video.controller.js";



const router = Router();

router.route("/upload").
post(verifyJWT , 
     upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),uploadVideo)


  router.route("/getVideoById").get(verifyJWT,getVideoById)
  router.route("/getAllVideos").get(verifyJWT,getAllVideos)
  router.route("/updateVideo").patch(verifyJWT,updateVideo)
  router.route("/deleteVideo").delete(verifyJWT,deleteVideo)
  router.route("/toggle-publish").patch(verifyJWT,togglePublishStatus)
  router.route("/getVideoByUser").get(verifyJWT,getVideosByUser)
  router.route("/getTrendingVideos").get(verifyJWT,getTrendingVideos)
  router.route("/view").post( verifyJWT, incrementVideoViews)
  router.route("/search").get(verifyJWT, searchVideos)

export default router;