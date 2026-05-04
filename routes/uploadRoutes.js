const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// Use memory storage to avoid writing files to disk
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB overall limit (max among all types)
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, videos, audio, and PDF files are allowed'));
    }
  }
});

// Size limits in bytes (max file size before compression)
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5 MB
  video: 10 * 1024 * 1024, // 10 MB
  audio: 10 * 1024 * 1024, // 10 MB
  pdf: 5 * 1024 * 1024,    // 5 MB
};

/**
 * Get file category from MIME type
 */
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return null;
};

/**
 * Get Cloudinary upload options based on file type
 * Applies compression transformations to meet target sizes:
 * - Images: compress to ~1MB
 * - Videos: compress to ~5MB
 * - Audio: compress to ~5MB
 * - PDFs: compress to ~1MB
 */
const getCloudinaryUploadOptions = (file) => {
  const category = getFileCategory(file.mimetype);

  switch (category) {
    case 'image': {
      return {
        resource_type: "image",
        transformation: {
          quality: "auto:best",    // Best quality within reasonable size
          fetch_format: "auto",    // Auto format (webp, etc.)
          width: 2000,             // Max width
          height: 2000,            // Max height
          crop: "limit",           // Only crop if exceeds dimensions
          dpr: 1.0,                // Device pixel ratio
          flags: "progressive",    // Progressive JPEG for faster perceived load
        },
      };
    }

    case 'video': {
      return {
        resource_type: "video",
        transformation: {
          quality: "auto:good",    // Balanced quality
          resolution: "720p",      // Reduce to 720p
          bit_rate: 1500,          // 1.5 Mbps video bitrate (for ~5MB per minute)
          audio_codec: "aac",      // Efficient audio codec
          audio_bit_rate: "128k",  // 128 kbps audio
          video_codec: "h264",     // Widely compatible
          fps: 25,                 // 25 fps (sufficient for most content)
          format: "mp4",           // Ensure MP4
        },
      };
    }

    case 'audio': {
      return {
        resource_type: "video",    // Cloudinary treats audio as video
        transformation: {
          quality: "auto:good",
          bit_rate: "128k",        // 128 kbps for ~1MB per minute
          audio_codec: "aac",
          format: "mp3",
        },
      };
    }

    case 'pdf': {
      return {
        resource_type: "raw",
        transformation: {
          quality: "auto:good",
          density: 150,            // 150 DPI (down from 300) reduces size significantly
        },
        use_filename: true,
        unique_filename: false,
      };
    }

    default:
      return null;
  }
};

/**
 * Convert buffer to readable stream for Cloudinary
 */
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
};

/**
 * Upload file buffer to Cloudinary with compression
 */
const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const category = getFileCategory(file.mimetype);

    if (!category) {
      return reject(new Error(`Unsupported file type: ${file.mimetype}`));
    }

    // Validate file size
    const maxSize = SIZE_LIMITS[category];
    if (file.size > maxSize) {
      return reject(new Error(
        `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit for ${category} files`
      ));
    }

    const uploadOptions = getCloudinaryUploadOptions(file);
    if (!uploadOptions) {
      return reject(new Error('Failed to determine upload options'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        ...uploadOptions,
        folder: "curator_uploads",
        resource_type: uploadOptions.resource_type,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    const stream = bufferToStream(file.buffer);
    stream.pipe(uploadStream);
  });
};

/**
 * Single file upload endpoint
 */
router.post("/", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file);

    res.json({
      success: true,
      fileUrl: cloudinaryResult.secure_url || cloudinaryResult.url,
      filename: cloudinaryResult.public_id,
      originalName: req.file.originalname,
      format: cloudinaryResult.format,
      resourceType: cloudinaryResult.resource_type,
      bytes: cloudinaryResult.bytes,
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file",
    });
  }
});

/**
 * Multiple files upload endpoint
 */
router.post("/multiple", upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadPromises = req.files.map((file) => uploadToCloudinary(file));
    const results = await Promise.allSettled(uploadPromises);

    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push({
          fileUrl: result.value.secure_url || result.value.url,
          filename: result.value.public_id,
          originalName: req.files[index].originalname,
        });
      } else {
        failed.push({
          fileName: req.files[index].originalname,
          error: result.reason.message,
        });
      }
    });

    res.json({
      success: failed.length === 0,
      successful,
      failed,
      message: failed.length > 0 ? `${failed.length} file(s) failed to upload` : "All files uploaded successfully",
    });

  } catch (error) {
    console.error("Multiple upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload files",
    });
  }
});

module.exports = router;
