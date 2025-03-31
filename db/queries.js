const prisma = require("./client");

async function createUser(user) {
    if (!user.username || !user.password) {
        throw new Error(
            "Invalid parameters: username and password are required"
        );
    }
    try {
        await prisma.user.create({
            data: {
                username: user.username,
                password: user.password,
            },
        });
    } catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Failed to create users");
    }
}

async function getUserFolders(userId) {
    try {
        const folders = await prisma.folder.findMany({
            where: {
                userId: userId,
            },
        });
        return folders;
    } catch (error) {
        console.error("Error fetching user folders:", error);
        throw new Error("Failed to fetch folders");
    }
}

async function createUserFolder(folder) {
    try {
        if (!folder.userId || !folder.name) {
            throw new Error("Invalid parameters: userId and name are required");
        }

        const slug = folder.name.toLowerCase().replace(/\s+/g, "-"); // 將空格轉為短橫線

        // 確保 slug 唯一
        const existingFolder = await prisma.folder.findUnique({
            where: { slug },
        });
        if (existingFolder) {
            throw new Error(
                "Folder name already exists. Please choose another name."
            );
        }

        return await prisma.folder.create({
            data: {
                name: folder.name,
                slug: slug,
                userId: folder.userId,
                parentId: folder.parentId || null, // 設定父資料夾 ID，根目錄為 null
            },
        });
    } catch (error) {
        console.error("Error creating user folder:", error);
        throw new Error("Failed to create folder");
    }
}

async function deleteUserFolder(deleteFolder) {
    try {
        const folder = await prisma.folder.findUnique({
            where: {
                id: folder.folderId,
            },
        });

        if (!folder) {
            throw new Error("Folder does not exist");
        }

        if (deleteFolder.userId !== folder.userId) {
            throw new Error("Unauthorized to delete this folder");
        }

        await prisma.folder.delete({
            where: {
                id: deleteFolder.folderId,
            },
        });

        return { message: "Folder deleted successfully" };
    } catch (error) {
        console.error("Error deleting user folder:", error);
        throw new Error("Failed to delete folder");
    }
}

async function getFolder(folderId) {
    try {
        const folder = await prisma.folder.findUnique({
            where: {
                folderId: folderId,
            },
        });
        return folder;
    } catch (error) {
        console.error("Error fetching folder:", error);
        throw new Error("Failed to fetch the folder");
    }
}

async function getFolderFiles(folderId) {
    try {
        const files = await prisma.file.findMany({
            where: {
                folderId: folderId,
            },
        });
        return files;
    } catch (error) {
        console.error("Error fetching folder files:", error);
        throw new Error("Failed to fetch files");
    }
}

async function createFolderFile(file) {
    try {
        if (!file.folderId || !file.name || !file.path) {
            throw new Error(
                "Invalid parameters: folderId, name and path are required"
            );
        }

        // 確認檔案的目標資料夾是否有父資料夾（不是根目錄）
        const folder = await prisma.folder.findUnique({
            where: { id: file.folderId },
        });

        if (!folder || folder.parentId === null) {
            throw new Error("Files can only be created inside subfolders");
        }

        return await prisma.file.create({
            data: {
                name: file.name,
                path: file.path,
                folderId: file.folderId,
            },
        });
    } catch (error) {
        console.error("Error creating folder file:", error);
        throw new Error("Failed to create file");
    }
}

async function deleteFolderFile(deleteFile) {
    try {
        const file = await prisma.file.findUnique({
            where: {
                id: deleteFile.fileId,
            },
        });

        if (!file) {
            throw new Error("File does not exist");
        }

        await prisma.file.delete({
            where: {
                id: deleteFile.fileId,
            },
        });

        return { message: "File deleted successfully" };
    } catch (error) {
        console.error(`Error deleting fileId ${fileId}:`, error);
        throw new Error(`Failed to delete file with ID: ${fileId}`);
    }
}

module.exports = {
    createUser,
    getUserFolders,
    createUserFolder,
    deleteUserFolder,
    getFolder,
    getFolderFiles,
    createFolderFile,
    deleteFolderFile,
};
