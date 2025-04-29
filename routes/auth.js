const express = require("express");
const passport = require("passport");
const router = express.Router();
const usersController = require("../controllers/usersController");
const { validateSignIn, validateSignUp } = require("../controllers/validation");
const crypto = require("crypto");
const prisma = require("../db/client");

// === Passport 設定 ====================================================

// 建議你將 Passport 的策略設定單獨放在配置模組中
// 但此處為了示例直接寫在此檔案內
passport.use(
    new (require("passport-local").Strategy)(
        async (username, password, done) => {
            try {
                const user = await require("../db/client").user.findUnique({
                    where: { username },
                });
                if (!user)
                    return done(null, false, { message: "User not found" });

                const isValid = await require("bcryptjs").compare(
                    password,
                    user.password
                );
                if (!isValid)
                    return done(null, false, { message: "Incorrect password" });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await require("../db/client").user.findUnique({
            where: { id },
            select: { id: true, username: true },
        });
        done(null, user);
    } catch (error) {
        done(error);
    }
});
// ======================================================================

// =====================================================
// User / Auth Routes using controllers
// =====================================================

// SIGN UP ROUTES
// Render sign-up form
router.get("/sign-up", usersController.signUpGet);
// Process sign-up form submission
router.post("/sign-up", validateSignUp, usersController.signUpPost);

// SIGN IN ROUTES
// Render sign-in form
router.get("/sign-in", usersController.signInGet);
// Process sign-in using Passport local strategy,
// upon success, redirect to home ("/") or再根據需求處理
router.post(
    "/sign-in",
    validateSignIn,
    passport.authenticate("local"),
    (req, res) => {
        res.redirect("/");
    }
);

// LOG OUT ROUTE
router.get("/log-out", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

// Shared token
router.post("/share", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(403).send("Unauthorized");
        }

        // 獲取使用者 ID 和分享的資源 ID (例如資料夾或檔案)
        const userId = req.user.id; // Passport 自動將登入使用者附加到 req.user
        const { resourceId, type } = req.body; // POST 請求中的資料 (例如 folderId 或 fileId)

        // 生成唯一 Token
        const token = crypto.randomBytes(16).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小時有效期

        // 將分享連結儲存到資料庫
        await prisma.sharedToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });

        // 返回完整的分享連結
        const shareUrl = `${req.protocol}://${req.get("host")}/share/${token}`;
        res.redirect(`/folders?shareUrl=${encodeURIComponent(shareUrl)}`);
    } catch (error) {
        console.error("Error generating share link:", error);
        res.status(500).send("Failed to generate share link");
    }
});

router.get("/share/:token", async (req, res) => {
    try {
        const { token } = req.params;

        // 查詢資料庫，檢查是否存在該 Token 且尚未過期
        const sharedToken = await prisma.sharedToken.findUnique({
            where: { token },
        });

        if (!sharedToken || new Date() > sharedToken.expiresAt) {
            return res.status(403).send("分享連結無效或已過期");
        }

        // 授權臨時身份 (模擬登入該使用者)
        const user = await prisma.user.findUnique({
            where: { id: sharedToken.userId },
        });

        req.login(user, (err) => {
            if (err) {
                console.error("Login error:", err);
                return res.status(500).send("授權失敗");
            }
            // 重定向至授權頁面或資源頁面
            res.redirect("/");
        });
    } catch (error) {
        console.error("Error accessing shared link:", error);
        res.status(500).send("訪問分享連結失敗");
    }
});

module.exports = router;
