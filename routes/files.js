const express = require("express");
const upload = require("../middlewares/multer");
const usersController = require("../controllers/usersController");
const router = express.Router();
const {
    validateUser,
    validateFolder,
    validateFile,
} = require("../controllers/validation");

router.get("/:username", usersController.userFoldersGet);
router.post("/create", validateFolder, usersController.userFolderPost);
router.delete("/folder", usersController.userFolderDelete);

router.get("/folder/:slug", usersController.foldersFileGet);
router.post(
    "/upload",
    validateFile,
    upload.single("file"),
    usersController.folderFilePost
);
router.delete("/file", usersController.folderFileDelete);

router.post("/sign-up", validateUser, usersController.signUpPost);
router.get("/sign-in", usersController.signInGet);
router.post(
    "/sign-in",
    passport.authenticate("local", {
        successRedirect: "/", // 登錄成功後跳轉
        failureRedirect: "/sign-in", // 登錄失敗後跳轉
        failureFlash: true, // 如果啟用 flash message，這裡可以顯示錯誤消息
    })
);
router.get("/log-out", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

module.exports = router;

// const express = require("express");
// const multer = require("../middleware/multer");
// const { uploadFile } = require("../services/cloudinaryService");

// const router = express.Router();

// router.post("/upload", multer.single("file"), async (req, res) => {
//     try {
//         const fileUrl = await uploadFile(req.file.path);
//         res.json({ message: "File uploaded successfully", url: fileUrl });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to upload file" });
//     }
// });

// module.exports = router;
