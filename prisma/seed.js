require("dotenv").config();
const prisma = require("../db/client");
const bcrypt = require("bcryptjs");

async function main() {
    console.log("Seeding...");
    const hashedPw = await bcrypt.hash("qwas1212", 12);
    await prisma.user.create({
        data: {
            username: "bagel",
            password: hashedPw,
        },
    });

    console.log("Seeding completed.");
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
