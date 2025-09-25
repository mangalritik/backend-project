// import multer from "multer"

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, '/public/temp')
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.originalname)
//     }
// })

// export const upload = multer({ storage, })



// =========================================2222==============================================


// import multer from "multer";
// import path from "path";

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, path.join(process.cwd(), "public", "temp")); 
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.originalname);
//     }
// });

// export const upload = multer({ storage });









// =====================================33333==========================================




// middlewares/multer.middleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Temp dir creation
const TEMP_DIR = path.join(process.cwd(), "public", "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// File storage logic
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const uniqueName = `${baseName}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

// Restrict to image/video only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp",
    "video/mp4", "video/quicktime", "video/mpeg"
  ];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported file type"), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

