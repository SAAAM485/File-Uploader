// storage.routes.js
const express = require("express");
const router = express.Router();
const parser = require("../middleware/multer"); // 已整合 CloudinaryStorage 的 multer parser
const prisma = require("../db/client");

// 如果你原本有分層 controllers 來管理 folder 與 file 操作，可保留部分控制器，
// 但因多層路徑的處理需要特殊邏輯，這裡將部分操作直接寫在路由中

// ------------------------------------------------------------------
// 檔案上傳（含多層資料夾支持）
// POST 請求範例：
//   /folders/folderA/folderB/files
// Cloudinary 回傳資訊放在 req.file
// ------------------------------------------------------------------
router.post("/folders/*/files", parser.single("file"), async (req, res) => {
    try {
        // req.params[0] 會取得匹配 /folders/*/files 中 * 的部分，
        // 例如 URL 為 /folders/folderA/folderB/files，則 folderPath = "folderA/folderB"
        const folderPath = req.params[0];

        // 依據完整路徑查詢對應的資料夾 (資料表 Folder 的 path 欄位)
        const folder = await prisma.folder.findUnique({
            where: { path: folderPath },
        });

        if (!folder) {
            return res.status(404).json({ message: "資料夾未找到" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "沒有上傳檔案" });
        }

        // 產生唯一 slug（請注意：此處為簡單示範，可根據需要擴充）
        const slug = await generateUniqueFileSlug(req.file.originalname);

        // 建立資料庫記錄，邏輯路徑為「父資料夾的 path + '/' + 檔案名稱」
        const newFile = await prisma.file.create({
            data: {
                name: req.file.originalname || req.file.filename,
                slug: slug,
                // 邏輯路徑：利用資料夾的 path 加上檔案名稱
                path: `${folder.path}/${req.file.originalname}`,
                // filePath 用來存儲 Cloudinary 回傳的實際 URL
                filePath: req.file.path,
                folderId: folder.id,
            },
        });

        res.status(200).json({
            message: "檔案上傳成功並存入資料庫",
            file: req.file,
            newFile,
        });
    } catch (error) {
        console.error("上傳錯誤:", error);
        res.status(500).json({
            error: "檔案上傳失敗",
            details: error.message,
        });
    }
});

// ------------------------------------------------------------------
// 手動新增檔案記錄 (非上傳)
// POST 請求範例：
//   /folders/folderA/folderB/files/manual
// Body 必須包含 { name, filePath }，
// name 代表檔案名稱、filePath 表示物理儲存路徑（例如 Cloudinary URL）
// ------------------------------------------------------------------
router.post("/folders/*/files/manual", async (req, res) => {
    try {
        const folderPath = req.params[0];
        const { name, filePath: physicalFilePath } = req.body;

        if (!name || !physicalFilePath) {
            return res
                .status(400)
                .json({ message: "缺少必要的檔案名稱或檔案路徑" });
        }

        const folder = await prisma.folder.findUnique({
            where: { path: folderPath },
        });

        if (!folder) {
            return res.status(404).json({ message: "資料夾未找到" });
        }

        const slug = await generateUniqueFileSlug(name);
        const newFile = await prisma.file.create({
            data: {
                name: name,
                slug: slug,
                path: `${folder.path}/${name}`,
                filePath: physicalFilePath,
                folderId: folder.id,
            },
        });

        res.status(200).json({
            message: "檔案記錄建立成功",
            file: newFile,
        });
    } catch (error) {
        console.error("新增檔案記錄錯誤:", error);
        res.status(500).json({
            error: "建立檔案記錄失敗",
            details: error.message,
        });
    }
});

// ------------------------------------------------------------------
// 刪除檔案（依據資料夾與檔案名稱識別）
// POST 請求範例：
//   /folders/folderA/folderB/files/delete
// Body 需要傳入 { fileName }，將以完整邏輯路徑 "folderA/folderB/fileName"來查找檔案
// ------------------------------------------------------------------
router.post("/folders/*/files/delete", async (req, res) => {
    try {
        const folderPath = req.params[0];
        const { fileName } = req.body;

        if (!fileName) {
            return res.status(400).json({ message: "必須提供檔案名稱" });
        }

        // 依據邏輯路徑組合，查詢檔案記錄
        const fileLogicalPath = `${folderPath}/${fileName}`;
        const file = await prisma.file.findUnique({
            where: { path: fileLogicalPath },
        });

        if (!file) {
            return res.status(404).json({ message: "找不到該檔案" });
        }

        await prisma.file.delete({
            where: { id: file.id },
        });

        res.status(200).json({ message: "檔案刪除成功" });
    } catch (error) {
        console.error("刪除檔案錯誤:", error);
        res.status(500).json({
            error: "檔案刪除失敗",
            details: error.message,
        });
    }
});

// ------------------------------------------------------------------
// 取得多層資料夾內容（子資料夾與檔案列表）
// GET 請求範例：
//   /folders/folderA/folderB
// ------------------------------------------------------------------
router.get("/folders/*", async (req, res) => {
    try {
        // 此處 req.params[0] 取得所有在 /folders/ 後面的路徑
        const folderPath = req.params[0];

        const folder = await prisma.folder.findUnique({
            where: { path: folderPath },
        });

        if (!folder) {
            return res.status(404).json({ message: "資料夾未找到" });
        }

        // 取得子資料夾與檔案（僅選取要顯示的欄位）
        const subfolders = await prisma.folder.findMany({
            where: { parentId: folder.id },
            select: { id: true, name: true, path: true },
        });
        const files = await prisma.file.findMany({
            where: { folderId: folder.id },
            select: { id: true, name: true, path: true, filePath: true },
        });

        res.status(200).json({
            folder: {
                id: folder.id,
                name: folder.name,
                path: folder.path,
            },
            subfolders,
            files,
        });
    } catch (error) {
        console.error("取得資料夾內容錯誤:", error);
        res.status(500).json({
            error: "無法取得資料夾內容",
            details: error.message,
        });
    }
});

// ------------------------------------------------------------------
// Folder related routes (保留原先的部份，如建立與刪除資料夾)
// 若需要支援多層資料夾，這些控制器內部可根據 req.body.folderId 與父資料夾的 path 來處理邏輯路徑
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// 輔助函式：產生唯一 file slug
// 此函式將檔案名稱轉為小寫、以 - 連接，並檢查資料庫中是否已有相同 slug
// ------------------------------------------------------------------
async function generateUniqueFileSlug(name) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const existingFile = await prisma.file.findUnique({
        where: { slug: slug },
    });
    if (existingFile) {
        throw new Error("File name already exists.");
    }
    return slug;
}

module.exports = router;
