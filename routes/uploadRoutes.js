const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// Simple in-memory rate limiter for protection on older servers
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.maxRequests = options.maxRequests || 10; // 10 requests per minute default
    this.requests = new Map(); // IP -> [{timestamp}, ...]
  }

  cleanOldEntries() {
    const cutoff = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => t > cutoff);
      if (valid.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, valid);
      }
    }
  }

  isAllowed(ip) {
    this.cleanOldEntries();
    const timestamps = this.requests.get(ip) || [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < this.windowMs);
    
    if (recent.length >= this.maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(ip, recent);
    return true;
  }
}

// Create rate limiter for upload endpoints
// Limits: 10 upload requests per minute per IP (adjust based on server capacity)
const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,     // 10 requests per minute
});

// Rate limiting middleware
const rateLimitMiddleware = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!uploadRateLimiter.isAllowed(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: 60 // seconds
    });
  }
  
  next();
};

/**
 * Run promises with limited concurrency to prevent memory spikes
 * @param {Array} tasks - Array of functions returning promises
 * @param {number} concurrency - Max concurrent executions (default: 3)
 * @returns {Promise<Array>} - Results in order
 */
const runWithConcurrency = async (tasks, concurrency = 3) => {
  const results = new Array(tasks.length);
  let currentIndex = 0;
  let activeCount = 0;
  
  return new Promise((resolve, reject) => {
    const runNext = async () => {
      if (currentIndex >= tasks.length && activeCount === 0) {
        return resolve(results);
      }
      
      while (activeCount < concurrency && currentIndex < tasks.length) {
        const index = currentIndex++;
        activeCount++;
        
        tasks[index]()
          .then(result => {
            results[index] = { status: 'fulfilled', value: result };
          })
          .catch(error => {
            results[index] = { status: 'rejected', reason: error };
          })
          .finally(() => {
            activeCount--;
            runNext();
          });
      }
    };
    
    runNext();
  });
};

// Wrapper for async route handlers to catch errors properly in Express 5.x
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Use memory storage with limited buffer to avoid excessive memory usage on older servers
// Set a reasonable limit slightly above max video size (10MB) to prevent DoS
const storage = multer.memoryStorage({
  limits: { fileSize: 12 * 1024 * 1024 } // 12MB hard limit for memory buffer
});

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

    // Check file size before processing
    if (file.size > 10 * 1024 * 1024) {
      return cb(new Error('File size exceeds 10MB limit'));
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only images, videos, audio, and PDF files are allowed'));
    }

    // Get category-specific size limit
    const category = getFileCategory(file.mimetype);
    const maxSize = SIZE_LIMITS[category];

    if (file.size > maxSize) {
      const limitMB = (maxSize / 1024 / 1024).toFixed(0);
      return cb(new Error(`File size exceeds ${limitMB}MB limit for ${category} files`));
    }

    cb(null, true);
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
 * Optimized for memory efficiency on older servers with timeout protection
 */
const uploadToCloudinary = async (file, timeout = 30000) => {
  return Promise.race([
    new Promise((resolve, reject) => {
      const category = getFileCategory(file.mimetype);

      if (!category) {
        return reject(new Error(`Unsupported file type: ${file.mimetype}`));
      }

      // Validate file size (redundant with fileFilter but safe)
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
          // Optimize for older servers: use eager transformations for immediate compression
          eager: uploadOptions.transformation ? [uploadOptions.transformation] : undefined,
          // Clean up unused files to save storage
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );

      // Create stream from buffer and pipe to Cloudinary
      const stream = bufferToStream(file.buffer);
      stream.pipe(uploadStream);

      // Clean up buffer reference to help garbage collection
      // Note: buffer will be garbage collected after this function exits
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Upload timeout: Server took too long to respond'));
      }, timeout);
    })
  ]);
};

/**
 * Single file upload endpoint
 * Protected by rate limiting and strict validation
 */
router.post("/", rateLimitMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
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
}));

/**
 * Multiple files upload endpoint
 * Protected by rate limiting and uses concurrency control
 */
router.post("/multiple", rateLimitMiddleware, upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }

  // Create task array for concurrency-limited execution
  // Limit to 3 concurrent uploads to manage memory on older servers
  const tasks = req.files.map((file) => () => uploadToCloudinary(file));
  
  const results = await runWithConcurrency(tasks, 3);

  const successful = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result && result.status === 'fulfilled') {
      successful.push({
        fileUrl: result.value.secure_url || result.value.url,
        filename: result.value.public_id,
        originalName: req.files[index].originalname,
        bytes: result.value.bytes,
      });
    } else {
      failed.push({
        fileName: req.files[index].originalname,
        error: result?.reason?.message || 'Unknown error',
      });
    }
  });

  res.json({
    success: failed.length === 0,
    successful,
    failed,
    message: failed.length > 0 ? `${failed.length} file(s) failed to upload` : "All files uploaded successfully",
  });
}));

module.exports = router;
