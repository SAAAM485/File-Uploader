// controllers/usersController.js
const db = require("../db/queries");
const prisma = require("../db/client");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

/* 
  ──────────────── 使用者與資料夾管理 ────────────────
*/
async function userFolderPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .render("errorPage", { message: "Failed creating the folder." });
    }

    // 若前端未傳 folderId 或傳入 "/"，則視為根目錄
    let parentId = null;
    if (req.body.folderId && req.body.folderId !== "/") {
        const parsedId = parseInt(req.body.folderId, 10);
        if (!isNaN(parsedId)) {
            parentId = parsedId;
        }
    }

    const folder = {
        userId: req.user.id,
        name: req.body.name,
        parentId: parentId, // 當為根目錄時，這裡會是 null
    };

    try {
        const newFolder = await db.createUserFolder(folder);
        // newFolder.path 已由 createUserFolder 組合好
        res.redirect(`/folders/${encodeURIComponent(newFolder.path)}`);
    } catch (error) {
        console.error("Error creating folder:", error);
        res.status(500).render("errorPage", {
            message: "Failed creating the folder.",
        });
    }
}

async function userFolderDelete(req, res) {
    const folderId = parseInt(req.body.folderId, 10);
    if (isNaN(folderId)) {
        throw new Error("Invalid folderId: Must be a number");
    }

    try {
        // 先取得該資料夾的資訊
        const folder = await db.getFolder(folderId);
        if (!folder) {
            return res
                .status(404)
                .render("errorPage", { message: "Folder not found." });
        }
        // 此處你也可以檢查是否有權限刪除（例如 req.user.id 與 folder.userId 比較）
        await db.deleteUserFolder({ folderId: folderId, userId: req.user.id });

        // 決定刪除後導向的路徑：
        // 若有父層，則導回父資料夾；若無（根目錄），則導向 /folders
        let redirectPath = "/folders";
        if (folder.parentId) {
            const parentFolder = await db.getFolder(folder.parentId);
            if (parentFolder) {
                redirectPath = `/folders/${encodeURIComponent(
                    parentFolder.path
                )}`;
            }
        }
        res.redirect(redirectPath);
    } catch (error) {
        console.error("Error deleting folder:", error);
        res.status(500).render("errorPage", {
            message: "Failed deleting the folder.",
        });
    }
}

/* 
  ──────────────── 檔案管理 ────────────────
*/
async function uploadFile(req, res) {
    try {
        const folderPath = req.params[0]; // 獲取多層路徑
        if (!folderPath || typeof folderPath !== "string") {
            throw new Error("Invalid folder path");
        }

        // 根據路徑獲取資料夾
        const folder = await db.getFolderByPath(folderPath);
        if (!folder) {
            return res
                .status(404)
                .render("errorPage", { message: "Cannot find the folder." });
        }

        // 檢查是否有上傳的檔案
        if (!req.file) {
            return res.status(400).render("errorPage", {
                message: "Did not choose the uploading file.",
            });
        }

        // 組合檔案數據
        const fileObj = {
            folderId: folder.id,
            name: req.file.originalname,
            path: req.file.path,
        };

        // 呼叫資料庫函式創建檔案
        await db.createFolderFile(fileObj);

        // 上傳成功後重定向回資料夾
        res.redirect(`/folders/${encodeURIComponent(folder.path)}`);
    } catch (error) {
        console.error("Error uploading the file:", error);
        res.status(500).render("errorPage", {
            message: "Failed uploading the file.",
        });
    }
}

async function deleteFile(req, res) {
    try {
        // 若路由有多層路徑，則使用 req.params[0]；否則檢查 req.body.folderId
        const folder = req.params[0]
            ? await db.getFolderByPath(req.params[0])
            : req.body.folderId
            ? await db.getFolder(req.body.folderId)
            : null;

        if (!folder) {
            return res
                .status(404)
                .render("errorPage", { message: "Cannot find the folder." });
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
                .render("errorPage", { message: "Cannot find the file." });
        }

        await db.deleteFolderFile({ fileId: file.id });
        res.redirect(`/folders/${encodeURIComponent(folder.path)}`);
    } catch (error) {
        console.error("Error deleting the file:", error);
        res.status(500).render("errorPage", {
            message: "Failed deleting the file.",
        });
    }
}

/* 
  ──────────────── 資料夾內容管理 ────────────────
*/
async function getFolderContents(req, res) {
    try {
        if (!req.isAuthenticated()) {
            return res.render("mainBoard", {
                title: "Welcome",
                isAuthenticated: false,
            });
        }
        const shareUrl = req.query.shareUrl || null;
        const userId = req.user.id;
        let folder,
            contents,
            isRoot = false;

        // 使用多層萬用字元路由，若有 req.params[0] 表示有多層路徑
        if (req.params[0]) {
            const folderPath = decodeURIComponent(req.params[0]);
            folder = await db.getFolderByPath(folderPath);
            if (!folder) {
                return res.status(404).render("errorPage", {
                    message: "Cannot find the folder.",
                });
            }
            contents = await db.getFolderFiles(folder.id);
        } else {
            // 若無多層路徑，代表當前在 /folders (根目錄)
            isRoot = true;
            const folders = await db.getUserFolders(userId);
            return res.render("mainBoard", {
                user: req.user,
                view: folders,
                title: req.user.username,
                shareUrl: shareUrl || null,
                isAuthenticated: true,
                folderPath: "/",
                isRoot,
            });
        }

        res.render("mainBoard", {
            folder: { id: folder.id, name: folder.name, path: folder.path },
            contents,
            title: folder.name,
            isAuthenticated: req.isAuthenticated(),
            folderPath: folder.path,
            isRoot,
        });
    } catch (error) {
        console.error("Error finding folder contents:", error);
        res.status(500).render("errorPage", {
            message: "Cannot find the folder contents.",
        });
    }
}

async function downloadFile(req, res) {
    try {
        const fileId = parseInt(req.params.fileId, 10);
        if (isNaN(fileId)) {
            throw new Error("Invalid fileId: Must be a number");
        }

        const file = await prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return res
                .status(404)
                .render("errorPage", { message: "File does not exist." });
        }

        // 暫存檔案位置
        const tempFilePath = path.join(__dirname, "temp", file.name);

        // 從 Cloudinary 下載檔案並保存到暫存目錄
        const response = await fetch(file.filePath); // 使用 Node.js 原生的 fetch（v18+）
        if (!response.ok) {
            throw new Error("Failed to fetch file from Cloudinary");
        }

        const fileStream = fs.createWriteStream(tempFilePath);
        response.body.pipe(fileStream);

        fileStream.on("finish", () => {
            // 將檔案傳送給使用者
            res.download(tempFilePath, file.name, (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    res.status(500).render("errorPage", {
                        message: "Failed to send file.",
                    });
                }
                // 清理暫存檔案
                fs.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error(
                            "Error cleaning up temp file:",
                            unlinkErr
                        );
                    }
                });
            });
        });
    } catch (error) {
        console.error("Error downloading the file:", error);
        return res
            .status(500)
            .render("errorPage", { message: "Failed downloading the file." });
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
        return res.status(400).render("signForm", {
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
    res.redirect("/folders");
}

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
