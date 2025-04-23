const prisma = require("./client");

async function generateUniqueSlug(name, model) {
    if (!name || typeof name !== "string") {
        throw new Error("Invalid name: must be a non-empty string");
    }
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const existing = await prisma[model].findUnique({ where: { slug } });
    if (existing) {
        throw new Error(`${model} name already exists.`);
    }
    return slug;
}

async function createUser(user) {
    if (!user.username || !user.password) {
        throw new Error(
            "Invalid parameters: username and password are required"
        );
    }
    try {
        await prisma.user.create({
            data: {
                username: user.username.trim(),
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
                parentId: null,
            },
        });
        return folders;
    } catch (error) {
        console.error("Error fetching user folders:", error);
        throw new Error("Failed to fetch folders");
    }
}
async function createUserFolder(folderData) {
    try {
        let newFolderPath = "";

        console.log("createUserFolder(): folderData received:", folderData);

        if (!folderData.parentId) {
            // 表示在根目錄下建立資料夾
            newFolderPath = folderData.name;
        } else {
            // 有 parentId 時，先嘗試取得父資料夾
            const parentFolder = await getFolder(folderData.parentId);
            if (!parentFolder) {
                // 父資料夾不存在，除非你希望丟出錯誤，否則可以選擇視同根目錄
                console.warn(
                    "Parent folder with id",
                    folderData.parentId,
                    "not found. Treating as root folder."
                );
                newFolderPath = folderData.name;
                // 或則選擇直接拋出錯誤：
                // throw new Error("Parent folder not found");
            } else {
                // 使用父資料夾的 path 組合新的路徑
                newFolderPath = `${parentFolder.path}/${folderData.name}`;
            }
        }
        const slug = await generateUniqueSlug(folderData.name, "folder");
        folderData.slug = slug;
        folderData.path = newFolderPath;
        console.log("Computed new folder path:", newFolderPath);

        // 執行建立資料夾
        const newFolder = await prisma.folder.create({
            data: folderData,
        });

        return newFolder;
    } catch (error) {
        console.error("Error in createUserFolder:", error);
        throw new Error("Failed to create folder");
    }
}

async function deleteUserFolder(deleteFolder) {
    try {
        const folder = await prisma.folder.findUnique({
            where: {
                id: deleteFolder.folderId,
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
    if (folderId === null) {
        return null;
    }
    try {
        const folder = await prisma.folder.findUnique({
            where: {
                id: folderId,
            },
        });
        return folder;
    } catch (error) {
        console.error("Error fetching folder:", error);
        throw new Error("Failed to fetch the folder");
    }
}

async function getFolderByPath(path) {
    if (!path || typeof path !== "string") {
        throw new Error("Invalid path: must be a non-empty string");
    }
    try {
        return await prisma.folder.findUnique({
            where: { path },
        });
    } catch (error) {
        console.error("Error fetching folder by path:", error);
        throw new Error("Failed to fetch folder by path");
    }
}

async function getFolderFiles(folderId) {
    try {
        const files = await prisma.file.findMany({
            where: {
                folderId: folderId,
            },
            select: {
                id: true,
                name: true,
                path: true,
            },
        });

        const subfolders = await prisma.folder.findMany({
            where: {
                parentId: folderId,
            },
            select: {
                id: true,
                name: true,
            },
        });

        // 標記每種資料類型
        const contents = [
            ...subfolders.map((folder) => ({ ...folder, type: "folder" })),
            ...files.map((file) => ({ ...file, type: "file" })),
        ];

        return contents;
    } catch (error) {
        console.error("Error fetching folder contents:", error);
        throw new Error("Failed to fetch folder contents");
    }
}

async function createFolderFile(file) {
    try {
        if (!file.folderId || !file.name || !file.path) {
            throw new Error(
                "Invalid parameters: folderId, name, and path are required"
            );
        }

        // 正確生成 slug
        const slug = await generateUniqueSlug(file.name, "file");

        const folder = await prisma.folder.findUnique({
            where: { id: file.folderId },
        });

        if (!folder) {
            throw new Error("Cannot find the folder.");
        }

        return await prisma.file.create({
            data: {
                name: file.name,
                slug: slug, // 確保是字串
                path: `${folder.path}/${file.name}`,
                filePath: file.path,
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
        console.error(`Error deleting fileId ${deleteFile.fileId}:`, error);
        throw new Error(`Failed to delete file with ID: ${fileId}`);
    }
}

module.exports = {
    createUser,
    getUserFolders,
    createUserFolder,
    deleteUserFolder,
    getFolder,
    getFolderByPath,
    getFolderFiles,
    createFolderFile,
    deleteFolderFile,
};
