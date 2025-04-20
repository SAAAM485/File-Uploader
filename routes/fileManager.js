// routes/fileManager.js
const express = require("express");
const router = express.Router();
const parser = require("../middleware/multer"); // 已整合 CloudinaryStorage 的 multer parser
const fileManagerController = require("../controllers/fileManagerController");

// 檔案上傳（含多層資料夾支持）
router.post(
    "/folders/*/files",
    parser.single("file"),
    fileManagerController.uploadFile
);

// 手動新增檔案記錄 (非上傳)
router.post("/folders/*/files/manual", fileManagerController.createFileManual);

// 刪除檔案（依據資料夾與檔案名稱判斷）
router.post("/folders/*/files/delete", fileManagerController.deleteFile);

// 取得多層資料夾內容（子資料夾與檔案列表）
router.get("/folders/*", fileManagerController.getFolderContents);

// 其他 Folder 相關路由（採用你現有的 usersControllers.js）
router.get(
    "/folders",
    require("../controllers/usersControllers").userFoldersGet
);
router.post(
    "/folders",
    require("../controllers/usersControllers").userFolderPost
);
router.post(
    "/folders/delete",
    require("../controllers/usersControllers").userFolderDelete
);

module.exports = router;
