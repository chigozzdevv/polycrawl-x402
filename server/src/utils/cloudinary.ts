import { v2 as cloudinary } from 'cloudinary';
import { loadEnv } from '@/config/env.js';

let configured = false;
export function getCloudinary() {
  if (!configured) {
    const env = loadEnv();
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary env missing');
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export function cloudinaryUrlUpload(publicId: string) {
  if (isHttpUrl(publicId)) return publicId;
  const c = getCloudinary();
  return c.url(publicId, { resource_type: 'raw', type: 'upload', secure: true });
}
