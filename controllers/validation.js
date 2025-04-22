const { body, validationResult } = require("express-validator");

const usernameLengthErr = "must be between 1 and 10 characters";
const passwordLengthErr = "must be between 1 and 16 characters";
const folderNameErr = "must be between 1 and 30 characters";
const fileNameErr = "must be between 1 and 30 characters";

const validateSignUp = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage(`Username ${usernameLengthErr}`),
    body("password")
        .trim()
        .isLength({ min: 1, max: 16 })
        .withMessage(`Password ${passwordLengthErr}`),
    body("confirmPassword")
        .trim()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        }),
];

const validateSignIn = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage(`Username ${usernameLengthErr}`),
    body("password")
        .trim()
        .isLength({ min: 1, max: 16 })
        .withMessage(`Password ${passwordLengthErr}`),
];

module.exports = { validateSignUp, validateSignIn };

// Validate folder creation data
const validateFolder = [
    body("name")
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage(`Folder name ${folderNameErr}`),
];

// Validate file creation data (手動新增檔案記錄時)
const validateFile = [
    body("name")
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage(`File name ${fileNameErr}`),
    body("path").trim().notEmpty().withMessage("File path is required"),
];

module.exports = {
    validateSignUp,
    validateSignIn,
    validateFolder,
    validateFile,
};
