import { createHash } from 'crypto';

/** Short MD5 ETag for HTML bodies (cache + conditional requests). */
export function generateETag(content: string): string {
  const hash = createHash('md5').update(content).digest('hex');
  return `"${hash.substring(0, 16)}"`;
}
