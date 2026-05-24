const CDN_BASE = process.env.NEXT_PUBLIC_B2_CDN_URL ?? "";

export function getFileViewUrl(fileId: string): string {
  return `${CDN_BASE}/${fileId}`;
}
