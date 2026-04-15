/**
 * Optimise une URL d'image Supabase Storage via Image Transformations.
 * Si l'URL n'est pas une URL Supabase Storage, elle est retournée telle quelle.
 */
export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  width: number = 800,
  quality: number = 75
): string {
  if (!originalUrl) return '';

  // Ne transformer que les URLs Supabase Storage
  if (!originalUrl.includes('/storage/v1/object/public/')) {
    return originalUrl;
  }

  const transformedUrl = originalUrl.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}width=${width}&quality=${quality}`;
}
