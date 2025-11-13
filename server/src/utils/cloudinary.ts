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

export async function resolveCloudinaryUploadUrl(publicIdOrUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(publicIdOrUrl)) return publicIdOrUrl;
  const c = getCloudinary();
  try {
    const res = await c.api.resource(publicIdOrUrl, { resource_type: 'raw' } as any);
    if (res?.secure_url) return String((res as any).secure_url);
  } catch {}
  return c.url(publicIdOrUrl, { resource_type: 'raw', type: 'upload', secure: true });
}
