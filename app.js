require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const prisma = require("./db/client");

const app = express();

// 中間件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: new PrismaSessionStore(prisma, { checkPeriod: 2 * 60 * 1000 }),
    })
);
app.use(passport.initialize());
app.use(passport.session());

// 使用路由
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

app.listen(3000, () => console.log("Server started on http://localhost:3000"));
