const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

// 設定 Cloudinary 帳戶資訊
cloudinary.config();

// 建立 Cloudinary Storage 實例，並指定預設上傳資料夾、格式、public_id 計算方式等
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "your_folder", // 指定要存放的資料夾名稱
        allowed_formats: ["jpg", "png", "jpeg"], // 限定上傳檔案格式
        // 若需要，也可以利用函數動態指定 public_id，例如：
        // public_id: (req, file) => `${Date.now()}-${file.originalname}`,
    },
});

// 建立 multer 的 parser，直接使用 CloudinaryStorage 作為 storage
const parser = multer({ storage: storage });

module.exports = parser;
