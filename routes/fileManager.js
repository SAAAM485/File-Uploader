// storage.routes.js
const express = require("express");
const router = express.Router();
const parser = require("../middleware/multer"); // 已整合 CloudinaryStorage 的 multer parser

// 引入 controllers（依據先前的 usersControllers.js）
const {
    userFoldersGet,
    userFolderPost,
    userFolderDelete,
    foldersFileGet,
    folderFilePost,
    folderFileDelete,
} = require("../controllers/usersControllers");

// 檔案上傳路由
// 假設前端上傳檔案欄位名稱為 "file"，同時附帶 folderId 欄位
router.post("/upload", parser.single("file"), async (req, res) => {
    try {
        // Cloudinary 回傳的資訊將放在 req.file 中
        console.log("Cloudinary 回傳資訊:", req.file);

        // 從 req.body 取得 folderId（請確認前端欄位名稱正確）
        const { folderId } = req.body;

        // 此處直接用 Prisma 新增檔案記錄（或可直接包裝到 controller 中）
        // ※ 若你有另一套 fileController.createFile()，也可以改用控制器方式
        const { PrismaClient } = require("@prisma/client");
        const prisma = new PrismaClient();
        const newFile = await prisma.file.create({
            data: {
                name: req.file.originalname || req.file.filename,
                path: req.file.path,
                folderId: Number(folderId),
            },
        });

        res.status(200).json({
            message: "檔案上傳成功並存入資料庫",
            file: req.file,
            newFile,
        });
    } catch (error) {
        console.error("上傳錯誤:", error);
        res.status(500).json({ error: "檔案上傳失敗", details: error.message });
    }
});

// ----------------------
// Folder Routes
// ----------------------

// 取得目前登入使用者的所有資料夾
// 這裡直接使用 Passport 附加的 req.user（請注意，需搭配驗證 middleware）
router.get("/folders", userFoldersGet);

// 建立新資料夾
router.post("/folders", userFolderPost);

// 刪除資料夾（前端需傳送 folderId，在 body 中）
router.post("/folders/delete", userFolderDelete);

// ----------------------
// Folder File Routes
// ----------------------

// 取得某個資料夾內的所有檔案列表
// 例如：GET /folders/123/files
// 注意：控制器內部應改用 req.params.id 而非 req.body.id
router.get(
    "/folders/:id/files",
    (req, res, next) => {
        // 如果需要，可將 req.params.id 複製到 req.body.id 以符合現有 controller 寫法
        req.body.id = req.params.id;
        next();
    },
    foldersFileGet
);

// 建立資料夾內的檔案記錄（非上傳，此路由可用於手動新增檔案資料）
// 例如：POST /folders/123/files，body 必須含有 name 與 path 欄位
router.post(
    "/folders/:folderId/files",
    (req, res, next) => {
        // 將 URL 參數 folderId 注入到 req.body 中以符合 controller 需求
        req.body.folderId = req.params.folderId;
        next();
    },
    folderFilePost
);

// 刪除資料夾內的檔案記錄
// 例如：POST /folders/123/files/delete
// 前端需傳入檔案 id（例如放在 req.body.id）
// 控制器會利用 req.body.folderId 與 req.body.id 判斷並刪除檔案
router.post(
    "/folders/:folderId/files/delete",
    (req, res, next) => {
        // 注入 folderId 至 req.body
        req.body.folderId = req.params.folderId;
        next();
    },
    folderFileDelete
);

module.exports = router;
