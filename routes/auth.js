const express = require("express");
const passport = require("passport");
const router = express.Router();
const usersController = require("../controllers/usersController");
const { validateSignIn, validateSignUp } = require("../controllers/validation");

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

module.exports = router;
