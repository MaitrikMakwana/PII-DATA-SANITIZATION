// Avatar storage backed by Cloudflare R2.
// The DB stores the R2 object key (e.g. "avatars/user-123.png").
// On each profile read the caller must call resolveAvatarUrl() to get a
// fresh presigned URL — profile.routes.ts handles this automatically.

import { r2Service } from '../services/r2.service';

/** Upload avatar buffer to R2 and return the R2 object key to persist in DB. */
export async function uploadAvatarBuffer(
  buffer: Buffer,
  userId: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split('/').pop() ?? 'jpg';
  const key = `avatars/${userId}.${ext}`;
  await r2Service.upload(key, buffer, mimeType);
  return key;
}

/**
 * Given the value stored in the DB avatarUrl field, return a usable URL.
 * If the value looks like an R2 key ("avatars/…") generate a fresh 24-hour
 * presigned URL; otherwise return the value unchanged (legacy / external URL).
 */
export async function resolveAvatarUrl(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('avatars/')) {
    return r2Service.getPresignedUrl(avatarUrl, 86400); // 24 h
  }
  return avatarUrl;
}

/** Delete the avatar from R2 for the given user (tries all common extensions). */
export async function deleteAvatarFromR2(userId: string, currentKey?: string | null): Promise<void> {
  if (currentKey && currentKey.startsWith('avatars/')) {
    await r2Service.delete(currentKey).catch(() => { /* already gone */ });
    return;
  }
  // Fallback: try common extensions if we don't know the exact key
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  await Promise.allSettled(exts.map(ext => r2Service.delete(`avatars/${userId}.${ext}`)));
}

// Keep the old export name so profile.routes.ts import still works without change
export { deleteAvatarFromR2 as deleteAvatarFromCloudinary };
