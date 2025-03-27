const express = require("express");
const upload = require("../middleware/multer");

const router = express.Router();

router.post("/upload", upload.single("file"), (req, res) => {
    res.json({ message: "File uploaded successfully", file: req.file });
});

module.exports = router;

// const express = require("express");
// const multer = require("../middleware/multer");
// const { uploadFile } = require("../services/cloudinaryService");

// const router = express.Router();

// router.post("/upload", multer.single("file"), async (req, res) => {
//     try {
//         const fileUrl = await uploadFile(req.file.path);
//         res.json({ message: "File uploaded successfully", url: fileUrl });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to upload file" });
//     }
// });

// module.exports = router;
