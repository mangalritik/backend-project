import ffmpeg  from "fluent-ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"

// Set ffmpeg and ffprobe paths

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const getVideoDuration = (filePath) =>{
    return new Promise((resolve, reject)=>{
        ffmpeg.ffprobe(filePath,(err, metadata)=>{
            if(err)return reject(err);
      const duration = metadata?.format?.duration;
      if (!duration) return resolve(0);

            // Return in seconds (or hh:mm:ss if needed)
            resolve(parseFloat(duration.toFixed(2)));
        });
    })
}

export {
    getVideoDuration
}