import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { r2Client, R2_BUCKET } from '../config/r2';

class R2Service {
  /** Upload a buffer or readable stream to R2 */
  async upload(key: string, body: Buffer | Readable, contentType: string): Promise<void> {
    await r2Client.send(
      new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         key,
        Body:        body,
        ContentType: contentType,
      }),
    );
  }

  /** Download an object — returns the S3 GetObjectCommandOutput */
  async download(key: string) {
    return r2Client.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
  }

  /** Delete an object from R2 */
  async delete(key: string): Promise<void> {
    await r2Client.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
  }

  /** Generate a pre-signed URL (useful for direct browser downloads) */
  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
    return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
  }

  /** Construct R2 object key */
  buildKey(prefix: 'originals' | 'sanitized', fileId: string, ext: string): string {
    return `${prefix}/${fileId}.${ext}`;
  }
}

export const r2Service = new R2Service();
