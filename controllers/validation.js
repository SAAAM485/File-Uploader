const { body, validationResult } = require("express-validator");

const lengthErr = "must be between 1 and 10 characters";
const titleErr = "must be between 1 and 30 characters";

const validateUser = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage(`Username ${lengthErr}`),
    body("password")
        .trim()
        .isLength({ min: 1, max: 16 })
        .withMessage(`Password ${lengthErr}`),
    body("confirmPassword")
        .trim()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        }),
];

const validateFolder = [
    body("name")
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage(`Folder name ${titleErr}`),
];

const validateFile = [
    body("name")
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage(`File name ${titleErr}`),
    body("path").trim(),
];

module.exports = { validateUser, validateFolder, validateFile };
