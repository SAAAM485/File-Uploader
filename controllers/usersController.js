const db = require("../db/queries");
const prisma = require("../db/client");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

/* 
  ──────────────── 使用者與資料夾管理 ────────────────
*/

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
        res.status(500).render("errorPage", { message: "資料夾建立失敗。" });
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
        res.status(500).render("errorPage", { message: "資料夾刪除失敗。" });
    }
}

/* 
  ──────────────── 檔案管理 ────────────────
*/

// 上傳檔案 (包含多層路徑處理)
async function uploadFile(req, res) {
    try {
        const folderPath = req.params[0];
        const folder = await db.getFolderByPath(folderPath);

        if (!folder) {
            return res
                .status(404)
                .render("errorPage", { message: "資料夾未找到。" });
        }

        if (!req.file) {
            return res
                .status(400)
                .render("errorPage", { message: "未選擇上傳檔案。" });
        }

        const fileObj = {
            folderId: folder.id,
            name: req.file.originalname,
            path: req.file.path,
        };

        const newFile = await db.createFolderFile(fileObj);

        res.redirect(`/folders/${folder.path}`);
    } catch (error) {
        console.error("檔案上傳錯誤:", error);
        res.status(500).render("errorPage", { message: "檔案上傳失敗。" });
    }
}

// 刪除檔案 (依據多層路徑或檔案 ID)
async function deleteFile(req, res) {
    try {
        const folder = req.params[0]
            ? await db.getFolderByPath(req.params[0])
            : req.body.folderId
            ? await db.getFolder(req.body.folderId)
            : null;

        if (!folder) {
            return res
                .status(404)
                .render("errorPage", { message: "資料夾未找到。" });
        }

        const file = req.body.fileId
            ? await prisma.file.findUnique({ where: { id: req.body.fileId } })
            : req.body.fileName
            ? await prisma.file.findUnique({
                  where: { path: `${folder.path}/${req.body.fileName}` },
              })
            : null;

        if (!file) {
            return res
                .status(404)
                .render("errorPage", { message: "檔案未找到。" });
        }

        await db.deleteFolderFile({ fileId: file.id });
        res.redirect(`/folders/${folder.path}`);
    } catch (error) {
        console.error("刪除檔案錯誤:", error);
        res.status(500).render("errorPage", { message: "檔案刪除失敗。" });
    }
}

/* 
  ──────────────── 資料夾內容管理 ────────────────
*/

// 取得資料夾內容 (支援根目錄、多層路徑及指定資料夾)
// 取得資料夾內容 (支援根目錄、多層路徑及指定資料夾)
async function getFolderContents(req, res) {
    try {
        const userId = req.user.id;
        let folder,
            contents,
            isRoot = false;

        if (req.params[0]) {
            // 多層路徑情況
            const rawFolderPath = req.params[0];
            const folderPath = decodeURIComponent(rawFolderPath);
            folder = await db.getFolderByPath(folderPath);

            if (!folder) {
                return res
                    .status(404)
                    .render("errorPage", { message: "資料夾未找到。" });
            }
            contents = await db.getFolderFiles(folder.id);
        } else if (req.body.folderId) {
            // 從 body 傳入 folderId 的情況
            folder = await db.getFolder(req.body.folderId);

            if (!folder) {
                return res
                    .status(404)
                    .render("errorPage", { message: "指定的資料夾不存在。" });
            }
            contents = await db.getFolderFiles(folder.id);
        } else {
            // 根目錄狀態
            isRoot = true;
            const folders = await db.getUserFolders(userId);
            return res.render("mainBoard", {
                view: folders,
                title: req.user.username,
                isAuthenticated: req.isAuthenticated(),
                folderPath: "/", // 根目錄路徑
                isRoot: isRoot,
            });
        }

        res.render("folderView", {
            folder: { id: folder.id, name: folder.name, path: folder.path },
            contents,
            title: folder.name,
            isAuthenticated: req.isAuthenticated(),
            folderPath: folder.path, // 傳遞當前資料夾路徑
            isRoot: isRoot, // 此時應該為 false
        });
    } catch (error) {
        console.error("取得資料夾內容錯誤:", error);
        res.status(500).render("errorPage", {
            message: "無法取得資料夾內容。",
        });
    }
}

async function downloadFile(req, res) {
    try {
        // 取得檔案 ID，例如從 URL 參數中：/download/:fileId
        const fileId = req.params.fileId;
        if (!fileId) {
            return res
                .status(400)
                .render("errorPage", { message: "缺少檔案識別碼。" });
        }

        // 查詢資料庫以取得該檔案記錄
        const file = await prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return res
                .status(404)
                .render("errorPage", { message: "檔案不存在。" });
        }

        // 假設 file.filePath 儲存了 Cloudinary 的公開 URL
        // 直接轉向該 URL，讓瀏覽器依據 Cloudinary 的設定下載檔案
        return res.redirect(file.filePath);

        // --- 若要採用代理下載 (可選) ---
        // 你可以使用 axios 或 node-fetch 去取得檔案內容，然後用下面的方式：
        // res.attachment(file.name);
        // res.send(fileContentStream);
    } catch (error) {
        console.error("檔案下載錯誤:", error);
        return res
            .status(500)
            .render("errorPage", { message: "檔案下載失敗。" });
    }
}

/* 
  ──────────────── 使用者驗證 ────────────────
*/

// 取得註冊頁面
async function signUpGet(req, res) {
    res.render("signForm", { title: "Sign Up" });
}

// 進行註冊
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

// 取得登入頁面
async function signInGet(req, res) {
    res.render("signForm", { title: "Sign In" });
}

module.exports = {
    userFolderPost,
    userFolderDelete,
    uploadFile,
    deleteFile,
    getFolderContents,
    downloadFile,
    signUpGet,
    signUpPost,
    signInGet,
};
