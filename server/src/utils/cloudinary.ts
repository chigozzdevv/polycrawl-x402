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

export function signCloudinaryUrl(publicId: string, opts?: { expiresInSeconds?: number }) {
  const c = getCloudinary();
  const exp = typeof opts?.expiresInSeconds === 'number' ? opts!.expiresInSeconds : 120;
  const expiresAt = Math.floor(Date.now() / 1000) + exp;
  return c.url(publicId, { sign_url: true, resource_type: 'raw', type: 'authenticated', expires_at: expiresAt });
}
