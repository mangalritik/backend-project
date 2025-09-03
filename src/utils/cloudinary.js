import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"

        })
        //file has been uploaded successfull
        console.log("file is uploaded on  cloudinary", response.url);
        setTimeout(() => {
            fs.unlink(localFilePath, (err) => {
                if (err) {
                    console.error("Error deleting file after 5 min:", err);
                } else {
                    console.log("Local file deleted after 5 minutes:", localFilePath);
                }
            });
        }, 5 * 60 * 1000); // 5 minutes
        // remove the locally saved temporary file as the upload operation got failed
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}


export { uploadOnCloudinary }


