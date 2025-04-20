// controllers/usersController.js
const db = require("../db/queries");
const prisma = require("../db/client");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

/* 
  ──────────────── 使用者與資料夾管理 ────────────────
*/

// 取得使用者的所有資料夾
async function userFoldersGet(req, res) {
    try {
        const folders = await db.getUserFolders(req.user.id);
        res.render("mainBoard", {
            view: folders,
            title: req.user.username,
            isAuthenticated: req.isAuthenticated(),
        });
    } catch (error) {
        console.error("Error fetching folders data:", error);
        res.status(500).send("Error fetching folders data.");
    }
}

// 新增使用者資料夾
async function userFolderPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const folder = {
        userId: req.user.id,
        name: req.body.name,
        parentId: req.body.folderId || null,
    };

    try {
        await db.createUserFolder(folder);
        res.redirect("/");
    } catch (error) {
        console.error("Error creating folder:", error);
        res.status(500).send("Error creating folder.");
    }
}

// 刪除使用者資料夾
async function userFolderDelete(req, res) {
    const folder = {
        userId: req.user.id,
        folderId: req.body.folderId,
    };

    try {
        await db.deleteUserFolder(folder);
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting folder:", error);
        res.status(500).send("Error deleting folder.");
    }
}

/* 
  ──────────────── 檔案/子資料夾管理 (原本邏輯) ────────────────
*/

// 透過資料夾 id 取得該資料夾內的檔案與子資料夾
async function foldersFileGet(req, res) {
    const folderId = req.body.id; // 取得資料夾 ID
    try {
        const { files, subfolders } = await db.getFolderFilesAndSubfolders(
            folderId
        );
        res.render("mainBoard", {
            view: { files, subfolders },
            title: req.user.username,
            isAuthenticated: req.isAuthenticated(),
        });
    } catch (error) {
        console.error("Error fetching files and folders data:", error);
        res.status(500).send("Error fetching files and folders data.");
    }
}

// 上傳檔案（透過 multer 上傳）後將檔案記錄存入資料庫
async function folderFilePost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }
    const file = {
        folderId: req.body.folderId,
        name: req.file.originalname,
        filePath: req.file.path,
    };
    try {
        await db.createFolderFile(file);
        res.redirect("/");
    } catch (error) {
        console.error("Error creating file:", error);
        res.status(500).send("Error creating file.");
    }
}

// 刪除指定檔案
async function folderFileDelete(req, res) {
    const file = {
        folderId: req.body.folderId,
        fileId: req.body.id,
    };
    try {
        const folder = await db.getFolder(file.folderId);
        if (!folder) {
            throw new Error("Folder does not exist");
        }
        await db.deleteFolderFile(file);
        res.redirect(`/folder/${folder.slug}`); // 用唯一 slug 作為 URL
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).send("Error deleting file.");
    }
}

/* 
  ──────────────── 檔案管理額外功能 (多層路徑等) ────────────────
  這部分主要針對從路由獲取完整的資料夾路徑 (透過 req.params[0])
  並利用 prisma 先查詢出完整路徑下的資料夾，再利用 db.queries 中的 createFolderFile 等方法
*/

// 透過上傳建立檔案記錄 (含多層資料夾處理)
async function uploadFile(req, res) {
    try {
        const folderPath = req.params[0]; // 例："folderA/folderB"
        const folder = await prisma.folder.findUnique({
            where: { path: folderPath },
        });
        if (!folder) {
            return res.status(404).json({ message: "資料夾未找到" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "沒有上傳檔案" });
        }
        const fileObj = {
            folderId: folder.id,
            name: req.file.originalname,
            path: req.file.path, // 存的是物理儲存路徑，例如 Cloudinary 回傳的 URL
        };
        const newFile = await db.createFolderFile(fileObj);
        res.status(200).json({
            message: "檔案上傳成功並存入資料庫",
            newFile,
        });
    } catch (error) {
        console.error("上傳錯誤:", error);
        res.status(500).json({
            error: "檔案上傳失敗",
            details: error.message,
        });
    }
}

// 手動建立檔案記錄 (非透過上傳)
async function createFileManual(req, res) {
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
        const fileObj = {
            folderId: folder.id,
            name: name,
            path: physicalFilePath,
        };
        const newFile = await db.createFolderFile(fileObj);
        res.status(200).json({
            message: "檔案記錄建立成功",
            newFile,
        });
    } catch (error) {
        console.error("建立檔案記錄錯誤:", error);
        res.status(500).json({
            error: "建立檔案記錄失敗",
            details: error.message,
        });
    }
}

// 刪除檔案 (依據路由中傳入的多層路徑及檔案名稱)
async function deleteFile(req, res) {
    try {
        const folderPath = req.params[0];
        const { fileName } = req.body;
        if (!fileName) {
            return res.status(400).json({ message: "必須提供檔案名稱" });
        }
        const folder = await prisma.folder.findUnique({
            where: { path: folderPath },
        });
        if (!folder) {
            return res.status(404).json({ message: "資料夾未找到" });
        }
        // 預期檔案記錄中邏輯路徑為 folder.path + "/" + fileName
        const fullFilePath = `${folder.path}/${fileName}`;
        const file = await prisma.file.findUnique({
            where: { path: fullFilePath },
        });
        if (!file) {
            return res.status(404).json({ message: "找不到該檔案" });
        }
        await db.deleteFolderFile({ fileId: file.id });
        res.status(200).json({ message: "檔案刪除成功" });
    } catch (error) {
        console.error("刪除檔案錯誤:", error);
        res.status(500).json({
            error: "檔案刪除失敗",
            details: error.message,
        });
    }
}

// 取得多層資料夾內容（包含子資料夾與檔案列表）
async function getFolderContents(req, res) {
    try {
        const folderPath = req.params[0];
        const folder = await prisma.folder.findUnique({
            where: { path: folderPath },
        });
        if (!folder) {
            return res.status(404).json({ message: "資料夾未找到" });
        }
        // 呼叫 db.queries 中取得檔案及子資料夾的函式，傳入 folder id
        const contents = await db.getFolderFiles(folder.id);
        res.status(200).json({
            folder: { id: folder.id, name: folder.name, path: folder.path },
            contents,
        });
    } catch (error) {
        console.error("取得資料夾內容錯誤:", error);
        res.status(500).json({
            error: "無法取得資料夾內容",
            details: error.message,
        });
    }
}

/* 
  ──────────────── 使用者驗證 ────────────────
*/

async function signUpGet(req, res) {
    res.render("signForm", { title: "Sign Up" });
}

async function signUpPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render("form", {
            title: "Sign Up",
            errorMessages: errors.array().map((err) => err.msg),
        });
    }
    const hashedPw = await bcrypt.hash(req.body.password, 12);
    const user = {
        username: req.body.username,
        password: hashedPw,
    };
    await db.createUser(user);
    res.redirect("/");
}

async function signInGet(req, res) {
    res.render("signForm", { title: "Sign In" });
}

module.exports = {
    userFoldersGet,
    userFolderPost,
    userFolderDelete,
    foldersFileGet,
    folderFilePost,
    folderFileDelete,
    uploadFile,
    createFileManual,
    deleteFile,
    getFolderContents,
    signUpGet,
    signUpPost,
    signInGet,
};
