// controllers/usersController.js
const db = require("../db/queries");
const prisma = require("../db/client");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

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
    const folderId = req.body.folderId;
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
        // 使用萬用字元路由後，完整多層路徑存放在 req.params[0]
        const folderPath = req.params[0];
        const folder = await db.getFolderByPath(folderPath);

        if (!folder) {
            return res
                .status(404)
                .render("errorPage", { message: "Cannot find the folder." });
        }

        if (!req.file) {
            return res.status(400).render("errorPage", {
                message: "Did not choose the uploading file.",
            });
        }

        const fileObj = {
            folderId: folder.id,
            name: req.file.originalname,
            path: req.file.path,
        };

        await db.createFolderFile(fileObj);

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
                view: folders,
                title: req.user.username,
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
        const fileId = req.params.fileId;
        if (!fileId) {
            return res
                .status(400)
                .render("errorPage", { message: "Missing file ID." });
        }

        const file = await prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return res
                .status(404)
                .render("errorPage", { message: "File does not exist." });
        }

        return res.redirect(file.filePath);
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
