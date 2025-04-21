// routes/fileManager.js
const express = require("express");
const router = express.Router();
const parser = require("../middleware/multer"); // 已整合 CloudinaryStorage 的 multer parser
const usersController = require("../controllers/usersController");

// 檔案上傳 (包含多層路徑處理)
// URL 示例：POST /folders/folderA/folderB/files
router.post(
    "/folders/*/files",
    parser.single("file"),
    usersController.uploadFile
);

// 刪除檔案 (依據多層資料夾或檔案ID)
// URL 示例：POST /folders/folderA/folderB/files/delete
router.post("/folders/*/files/delete", usersController.deleteFile);

// 取得多層資料夾內容 (子資料夾與檔案列表)
// URL 示例：GET /folders/folderA/folderB
router.get("/folders/*", usersController.getFolderContents);

// 檔案下載功能
// URL 示例：GET /download/:fileId
router.get("/download/:fileId", usersController.downloadFile);

// Folder 相關路由 (使用者資料夾管理)
router.post("/folders", usersController.userFolderPost);
router.post("/folders/delete", usersController.userFolderDelete);

module.exports = router;
