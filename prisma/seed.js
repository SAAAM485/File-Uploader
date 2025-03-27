const prisma = require("../src/db/client");

async function main() {
    console.log("Seeding...");

    await prisma.members.create({
        data: {
            firstName: "John",
            lastName: "Doe",
            username: "johndoe",
            password: "hashed_password",
            admin: true,
        },
    });

    console.log("Seeding completed.");
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
