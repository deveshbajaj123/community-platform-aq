const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { authMiddleware, requireActiveMember } = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 4 // Max 4 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Upload post images (max 4)
router.post(
  '/images',
  authMiddleware,
  requireActiveMember,
  upload.array('images', 4),
  uploadController.uploadImages
);

// Upload avatar
router.post(
  '/avatar',
  authMiddleware,
  upload.single('avatar'),
  uploadController.uploadAvatar
);

module.exports = router;
