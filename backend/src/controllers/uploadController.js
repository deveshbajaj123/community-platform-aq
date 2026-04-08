const { uploadBlob, generateBlobName } = require('../config/azure');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Upload post images
 * POST /api/upload/images
 */
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return errorResponse(res, 'No images provided', 400);
  }

  if (req.files.length > 4) {
    return errorResponse(res, 'Maximum 4 images allowed', 400);
  }

  const uploadedImages = [];

  for (const file of req.files) {
    const blobName = generateBlobName(file.originalname, 'posts');

    try {
      const result = await uploadBlob(file.buffer, blobName, file.mimetype);
      uploadedImages.push({
        url: result.url,
        name: result.name,
        size: file.size
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      return errorResponse(res, 'Failed to upload images', 500);
    }
  }

  return successResponse(res, { images: uploadedImages }, 'Images uploaded successfully');
});

/**
 * Upload avatar
 * POST /api/upload/avatar
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'No image provided', 400);
  }

  const blobName = generateBlobName(req.file.originalname, 'avatars');

  try {
    const result = await uploadBlob(req.file.buffer, blobName, req.file.mimetype);

    return successResponse(res, {
      url: result.url,
      name: result.name
    }, 'Avatar uploaded successfully');
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return errorResponse(res, 'Failed to upload avatar', 500);
  }
});

module.exports = {
  uploadImages,
  uploadAvatar
};
