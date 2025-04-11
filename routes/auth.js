const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const prisma = require("../db/client"); // 假設你已對應好 Prisma client

const router = express.Router();

passport.use(
    new (require("passport-local").Strategy)(
        async (username, password, done) => {
            try {
                const user = await prisma.user.findUnique({
                    where: { username },
                });
                if (!user)
                    return done(null, false, { message: "User not found" });

                const isValid = await bcrypt.compare(password, user.password);
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
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true },
    });
    done(null, user);
});

router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { username, password: hashedPassword },
        });
        res.json(user);
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});

router.post("/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Logged in successfully", user: req.user });
});
router.get("/log-out", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

module.exports = router;
