const db = require("../db/queries");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

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

async function foldersFileGet(req, res) {
    const folderId = req.body.id; // 取得資料夾 ID
    try {
        // 呼叫擴展的方法來取得檔案及子資料夾
        const { files, subfolders } = await db.getFolderFilesAndSubfolders(
            folderId
        );

        // 傳遞檔案和子資料夾給 EJS
        res.render("mainBoard", {
            view: {
                files,
                subfolders,
            },
            title: req.user.username, // 例如顯示使用者名稱
            isAuthenticated: req.isAuthenticated(), // 判斷是否已登入
        });
    } catch (error) {
        console.error("Error fetching files and folders data:", error);
        res.status(500).send("Error fetching files and folders data.");
    }
}

async function folderFilePost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // 確認檔案是否已被上傳
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    // 從 multer 提供的 req.file 中獲取檔案資訊
    const file = {
        folderId: req.body.folderId, // 從表單中獲取 folderId
        name: req.file.originalname, // 檔案的原始名稱
        path: req.file.path, // 檔案的存儲路徑
    };

    try {
        // 將檔案資訊存入資料庫
        await db.createFolderFile(file);
        res.redirect("/");
    } catch (error) {
        console.error("Error creating file:", error);
        res.status(500).send("Error creating file.");
    }
}

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
        res.redirect(`/folder/${folder.slug}`); // 使用唯一 slug 作為 URL
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).send("Error deleting file.");
    }
}

async function signUpGet(req, res) {
    res.render("signForm", { title: "Sign Up" });
}

async function signUpPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render("form", {
            title: "Sign Up", // 替換為對應頁面的 title
            errorMessages: errors.array().map((err) => err.msg), // 錯誤訊息陣列
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
    signUpGet,
    signUpPost,
    signInGet,
};

module.exports = {
    userFoldersGet,
    userFolderPost,
    userFolderDelete,
    foldersFileGet,
    folderFilePost,
    folderFileDelete,
    signUpGet,
    signUpPost,
    signInGet,
};
