require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const prisma = require("./db/client");
const port = process.env.PORT || 3000;
const app = express();

// 中間件配置
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000, // 每 2 分鐘清理過期 session
            dbRecordIdIsSessionId: true,
            expiration: 24 * 60 * 60 * 1000, // 設定 session 過期時間為 24 小時
        }),
    })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.locals.errorMessages = req.flash("error");
    next();
});
app.use(express.static(path.join(__dirname, "public")));

// 使用路由
const authRoutes = require("./routes/auth");
const filesRoutes = require("./routes/fileManager");
app.use("/", authRoutes);
app.use("/", filesRoutes);

app.listen(port, () => {
    console.log(`Server running at port http://localhost:${port}/`);
});
