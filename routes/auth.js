const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const prisma = require("../db/client");

const router = express.Router();

// 使用本地策略
passport.use(
    new (require("passport-local").Strategy)(
        async (username, password, done) => {
            const user = await prisma.user.findUnique({ where: { username } });
            if (!user) return done(null, false, { message: "User not found" });

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid)
                return done(null, false, { message: "Incorrect password" });

            return done(null, user);
        }
    )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true },
    });
    done(null, user);
});

// 註冊路由
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: { username, password: hashedPassword },
    });
    res.json(user);
});

// 登入路由
router.post("/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Logged in successfully" });
});

module.exports = router;
