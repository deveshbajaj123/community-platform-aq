const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

let blobServiceClient;
let containerClient;

const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'community-posts';

async function initializeStorage() {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

      // Create container if it doesn't exist
      await containerClient.createIfNotExists({
        access: 'blob' // Allow public read access for blobs
      });

      console.log(`Azure Blob Storage initialized: container '${CONTAINER_NAME}'`);
    } catch (error) {
      console.error('Failed to initialize Azure Blob Storage:', error.message);
    }
  } else {
    console.log('Azure Blob Storage not configured - using local storage fallback');
  }
}

// Initialize storage on module load
initializeStorage();

/**
 * Upload a file to Azure Blob Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} blobName - Name for the blob
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, name: string}>}
 */
async function uploadBlob(buffer, blobName, contentType) {
  if (!containerClient) {
    throw new Error('Azure Blob Storage not configured');
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType }
  });

  return {
    url: blockBlobClient.url,
    name: blobName
  };
}

/**
 * Delete a blob from Azure Blob Storage
 * @param {string} blobName - Name of the blob to delete
 */
async function deleteBlob(blobName) {
  if (!containerClient) {
    throw new Error('Azure Blob Storage not configured');
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

/**
 * Allowed file extensions for uploads
 */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

/**
 * Sanitize file extension - removes path traversal and validates against whitelist
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized extension or 'bin' if invalid
 */
function sanitizeExtension(filename) {
  if (!filename || typeof filename !== 'string') return 'bin';

  // Remove path traversal characters and get the last part
  const safeName = filename
    .replace(/[/\\]/g, '')  // Remove path separators
    .replace(/\.\./g, '')    // Remove .. sequences
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename chars
    .toLowerCase();

  // Get extension from the safe filename
  const parts = safeName.split('.');
  const ext = parts.length > 1 ? parts.pop() : 'bin';

  // Validate against whitelist
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    return ext;
  }

  return 'bin';
}

/**
 * Generate a unique blob name
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'posts', 'avatars')
 * @returns {string}
 */
function generateBlobName(originalName, prefix = 'uploads') {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ext = sanitizeExtension(originalName);
  return `${prefix}/${timestamp}-${randomId}.${ext}`;
}

module.exports = {
  containerClient,
  uploadBlob,
  deleteBlob,
  generateBlobName
};
