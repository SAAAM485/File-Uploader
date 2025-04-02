require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const prisma = require("./db/client");

const app = express();

// 中間件配置
app.set("view engine", "ejs");
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
const filesRoutes = require("./routes/files");
app.use("/auth", authRoutes);
app.use("/files", filesRoutes);

app.listen(3000, () => console.log("Server started on http://localhost:3000"));
