const db = require("../db/queries");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

async function userFoldersGet(req, res) {
    try {
        const folders = await db.getUserFolders(req.id);
        res.render("mainBoard", {
            view: folders,
            title: req.username,
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
        userId: req.userId,
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
        userId: req.id,
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
    const folderId = req.body.id;
    try {
        const files = await db.getFolderFiles(folderId);
        res.render("mainBoard", {
            view: files,
            title: req.username,
            isAuthenticated: req.isAuthenticated(),
        });
    } catch (error) {
        console.error("Error fetching files data:", error);
        res.status(500).send("Error fetching files data.");
    }
}

async function folderFilePost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const file = {
        folderId: req.body.folderId,
        name: req.body.name,
        path: req.body.path,
    };

    try {
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
    const admin = req.body.admin === "bagel" ? true : false;
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
