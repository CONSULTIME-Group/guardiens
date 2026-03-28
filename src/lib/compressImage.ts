import imageCompression from "browser-image-compression";

/**
 * Compress an image file to a target max size (default 5MB).
 * Non-image files (PDF, etc.) are returned as-is.
 */
export async function compressImageFile(
  file: File,
  maxSizeMB = 5,
  maxWidthOrHeight = 2048
): Promise<File> {
  // Skip non-image files (PDF, etc.)
  if (!file.type.startsWith("image/")) return file;

  // Already under limit — skip
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/jpeg",
  });

  // Return as File (not Blob) so .name is preserved
  return new File([compressed], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}
