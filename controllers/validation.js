const { body, validationResult } = require("express-validator");

const alphaErr = "must only contain letters";
const lengthErr = "must be between 1 and 10 characters";
const titleErr = "must be between 1 and 30 characters";
const contentErr = "Must be between 1 and 200 characters";

const validateUser = [
    body("firstName")
        .trim()
        .isAlpha()
        .withMessage(`First name ${alphaErr}`)
        .isLength({ min: 1, max: 10 })
        .withMessage(`First name ${lengthErr}`),
    body("lastName")
        .trim()
        .isAlpha()
        .withMessage(`Last name ${alphaErr}`)
        .isLength({ min: 1, max: 10 })
        .withMessage(`Last name ${lengthErr}`),
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

const validatePost = [
    body("title")
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage(`Username ${titleErr}`),
    body("content")
        .trim()
        .optional({ checkFalsy: true })
        .isLength({ min: 1, max: 200 })
        .withMessage(contentErr),
];

module.exports = { validateUser, validatePost };
