require("dotenv").config();
const prisma = require("../db/client");

async function main() {
    console.log("Seeding...");

    await prisma.user.create({
        data: {
            username: "bagel",
            password: "qwas1212",
        },
    });

    console.log("Seeding completed.");
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
