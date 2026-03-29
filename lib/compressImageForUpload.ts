/**
 * Client-only: re-encode as JPEG, lowering quality and dimensions until size <= maxBytes.
 */
export async function compressImageToMaxBytes(file: File, maxBytes: number): Promise<File> {
  if (typeof window === 'undefined') {
    throw new Error('Image compression requires a browser.')
  }
  if (file.size <= maxBytes) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Could not read this image. Try JPEG or PNG.')
  }

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not compress image.')

    const origW = bitmap.width
    const origH = bitmap.height
    if (!origW || !origH) throw new Error('Invalid image dimensions.')

    let longEdge = Math.min(4096, Math.max(origW, origH))
    let quality = 0.88
    const minLongEdge = 400

    for (let iter = 0; iter < 56; iter += 1) {
      const scale = longEdge / Math.max(origW, origH)
      const w = Math.max(1, Math.round(origW * scale))
      const h = Math.max(1, Math.round(origH * scale))
      canvas.width = w
      canvas.height = h
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(bitmap, 0, 0, w, h)

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      })
      if (!blob) throw new Error('Image encoding failed.')

      if (blob.size <= maxBytes) {
        const base = file.name.replace(/\.[^.]+$/i, '') || 'image'
        return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
      }

      if (quality > 0.5) {
        quality -= 0.06
      } else {
        quality = 0.82
        longEdge = Math.floor(longEdge * 0.78)
      }
      if (longEdge < minLongEdge) {
        throw new Error(
          'This image is still too large after compression. Try a smaller original or lower resolution.'
        )
      }
    }

    throw new Error('Could not compress image under the size limit.')
  } finally {
    bitmap.close()
  }
}
