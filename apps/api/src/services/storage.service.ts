/**
 * Storage Service - Abstracted file storage (Local or S3-compatible)
 * 
 * Supports:
 * - Local storage (default, for development)
 * - AWS S3
 * - Cloudflare R2 (S3-compatible)
 * - MinIO and other S3-compatible services
 * 
 * Enable S3 by setting environment variables:
 * - STORAGE_PROVIDER=s3
 * - S3_BUCKET=your-bucket
 * - S3_REGION=us-east-1
 * - S3_ENDPOINT (optional, for R2/MinIO)
 * - S3_ACCESS_KEY=your-access-key
 * - S3_SECRET_KEY=your-secret-key
 */

import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, createReadStream } from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Configuration types
interface StorageConfig {
  provider: 'local' | 's3';
  // Local config
  localPath?: string;
  // S3 config
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3PublicUrl?: string; // Custom domain/CDN URL
}

interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
  provider: 'local' | 's3';
}

interface DeleteResult {
  success: boolean;
  message: string;
}

// Get configuration from environment
function getStorageConfig(): StorageConfig {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  
  if (provider === 's3') {
    return {
      provider: 's3',
      s3Bucket: process.env.S3_BUCKET || '',
      s3Region: process.env.S3_REGION || 'us-east-1',
      s3Endpoint: process.env.S3_ENDPOINT,
      s3AccessKey: process.env.S3_ACCESS_KEY,
      s3SecretKey: process.env.S3_SECRET_KEY,
      s3PublicUrl: process.env.S3_PUBLIC_URL, // Custom CDN URL (e.g., https://cdn.example.com)
    };
  }
  
  return {
    provider: 'local',
    localPath: process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'),
  };
}

// Initialize S3 client (lazy loading)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  
  const config = getStorageConfig();
  
  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: config.s3Region!,
    credentials: {
      accessKeyId: config.s3AccessKey!,
      secretAccessKey: config.s3SecretKey!,
    },
  };
  
  // Add custom endpoint for R2/MinIO
  if (config.s3Endpoint) {
    clientConfig.endpoint = config.s3Endpoint;
    clientConfig.forcePathStyle = true; // Required for R2 and MinIO
  }
  
  s3Client = new S3Client(clientConfig);
  return s3Client;
}

// Local storage helpers
function ensureLocalUploadDir(subdir: string = 'images'): string {
  const config = getStorageConfig();
  const uploadDir = join(config.localPath!, subdir);
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

// Generate unique filename
function generateFilename(originalFilename: string): string {
  const ext = extname(originalFilename || '.jpg').toLowerCase();
  return `${randomUUID()}${ext}`;
}

/**
 * Upload a file buffer to storage
 */
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  mimetype: string,
  subdir: string = 'images'
): Promise<UploadResult> {
  const config = getStorageConfig();
  const filename = generateFilename(originalFilename);
  
  if (config.provider === 's3') {
    return uploadToS3(buffer, filename, mimetype, subdir);
  }
  
  return uploadToLocal(buffer, filename, mimetype, subdir);
}

/**
 * Upload file to local storage
 */
async function uploadToLocal(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  subdir: string
): Promise<UploadResult> {
  const uploadDir = ensureLocalUploadDir(subdir);
  const filepath = join(uploadDir, filename);
  writeFileSync(filepath, buffer);
  
  return {
    url: `/uploads/${subdir}/${filename}`,
    filename,
    size: buffer.length,
    mimetype,
    provider: 'local',
  };
}

/**
 * Upload file to S3-compatible storage
 */
async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  subdir: string
): Promise<UploadResult> {
  const config = getStorageConfig();
  const key = `${subdir}/${filename}`;
  
  const client = getS3Client();
  
  await client.send(new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    // Cache for 1 year (public assets)
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  
  // Determine public URL
  let url: string;
  if (config.s3PublicUrl) {
    // Use custom CDN URL
    url = `${config.s3PublicUrl.replace(/\/$/, '')}/${key}`;
  } else if (config.s3Endpoint) {
    // Use S3-compatible endpoint (R2, MinIO)
    url = `${config.s3Endpoint.replace(/\/$/, '')}/${config.s3Bucket}/${key}`;
  } else {
    // Use AWS S3 default URL
    url = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;
  }
  
  return {
    url,
    filename: key, // Store the full S3 key
    size: buffer.length,
    mimetype,
    provider: 's3',
  };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(filename: string, subdir: string = 'images'): Promise<DeleteResult> {
  const config = getStorageConfig();
  
  if (config.provider === 's3') {
    return deleteFromS3(filename, subdir);
  }
  
  return deleteFromLocal(filename, subdir);
}

/**
 * Delete file from local storage
 */
async function deleteFromLocal(filename: string, subdir: string): Promise<DeleteResult> {
  const config = getStorageConfig();
  
  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return { success: false, message: 'Invalid filename' };
  }
  
  const filepath = join(config.localPath!, subdir, filename);
  
  if (existsSync(filepath)) {
    unlinkSync(filepath);
    return { success: true, message: 'Image deleted' };
  }
  
  return { success: true, message: 'File not found (already deleted)' };
}

/**
 * Delete file from S3-compatible storage
 */
async function deleteFromS3(filename: string, subdir: string): Promise<DeleteResult> {
  const config = getStorageConfig();
  const key = filename.startsWith(`${subdir}/`) ? filename : `${subdir}/${filename}`;
  
  try {
    const client = getS3Client();
    await client.send(new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
    }));
    
    return { success: true, message: 'Image deleted from S3' };
  } catch (error: any) {
    // S3 doesn't throw error if file doesn't exist
    if (error.name === 'NoSuchKey') {
      return { success: true, message: 'File not found (already deleted)' };
    }
    throw error;
  }
}

/**
 * Get file URL (public URL for accessing the file)
 */
export function getFileUrl(filename: string, subdir: string = 'images'): string {
  const config = getStorageConfig();
  
  if (config.provider === 's3') {
    if (config.s3PublicUrl) {
      return `${config.s3PublicUrl.replace(/\/$/, '')}/${subdir}/${filename}`;
    } else if (config.s3Endpoint) {
      return `${config.s3Endpoint.replace(/\/$/, '')}/${config.s3Bucket}/${subdir}/${filename}`;
    } else {
      return `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${subdir}/${filename}`;
    }
  }
  
  // Local storage - return relative URL
  return `/uploads/${subdir}/${filename}`;
}

/**
 * Check if storage is properly configured
 */
export function isStorageConfigured(): { configured: boolean; provider: 'local' | 's3'; message: string } {
  const config = getStorageConfig();
  
  if (config.provider === 's3') {
    const missing: string[] = [];
    if (!config.s3Bucket) missing.push('S3_BUCKET');
    if (!config.s3Region) missing.push('S3_REGION');
    if (!config.s3AccessKey) missing.push('S3_ACCESS_KEY');
    if (!config.s3SecretKey) missing.push('S3_SECRET_KEY');
    
    if (missing.length > 0) {
      return {
        configured: false,
        provider: 's3',
        message: `S3 not configured. Missing: ${missing.join(', ')}`,
      };
    }
  }
  
  return {
    configured: true,
    provider: config.provider,
    message: config.provider === 's3' ? 'S3 storage configured' : 'Local storage (default)',
  };
}

export default {
  uploadFile,
  deleteFile,
  getFileUrl,
  isStorageConfigured,
};
