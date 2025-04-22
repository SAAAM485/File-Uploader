const express = require("express");
const router = express.Router();
const parser = require("../middlewares/multer"); // 已整合 CloudinaryStorage 的 multer parser
const usersController = require("../controllers/usersController");

router.get("/folders", usersController.getFolderContents); // 處理 /folders 時顯示根目錄
router.get("/folders/*", usersController.getFolderContents); // 捕捉 /folders/... 的多層路徑
router.post(
    "/folders/:folderPath/files",
    parser.single("file"),
    usersController.uploadFile
);
router.post("/folders/:folderPath/files/delete", usersController.deleteFile);
router.get("/download/:fileId", usersController.downloadFile);
router.post("/folders", usersController.userFolderPost);
router.post("/folders/delete", usersController.userFolderDelete);
router.get("/", usersController.getFolderContents);

module.exports = router;
