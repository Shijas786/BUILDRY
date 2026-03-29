import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firebaseAuth, firebaseStorage } from '@/lib/firebaseClient'
import { compressImageToMaxBytes } from '@/lib/compressImageForUpload'
import {
  compressVideoToMaxBytes,
  type CompressVideoProgress,
} from '@/lib/compressVideoForUpload'

export type { CompressVideoProgress }

export type UploadPostMediaOptions = {
  onVideoCompressProgress?: (p: CompressVideoProgress) => void
  /** Called right before Firebase `uploadBytes` (after any compression). */
  onUploadStart?: () => void
}

/** Max size per object after any image compression (matches Storage rule). */
export const MAX_POST_MEDIA_BYTES = 200 * 1024 * 1024

/** Human-readable cap for UI copy (keeps in sync with `MAX_POST_MEDIA_BYTES`). */
export const MAX_POST_MEDIA_MB = MAX_POST_MEDIA_BYTES / (1024 * 1024)

export type UploadedPostMediaKind = 'image' | 'video'

/**
 * Client-only: upload a single image or video for a feed post under `post-media/{userId}/…`.
 * Oversized images and videos are re-encoded in-browser until they fit (videos: ffmpeg.wasm; may be slow).
 */
export async function uploadPostMediaFile(
  userId: string,
  file: File,
  options?: UploadPostMediaOptions
): Promise<{ url: string; kind: UploadedPostMediaKind }> {
  if (!firebaseStorage) {
    throw new Error('Storage is not configured (set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).')
  }
  const authed = firebaseAuth?.currentUser
  if (!authed || authed.uid !== userId) {
    throw new Error('Sign in again to upload media.')
  }

  const isVideo = file.type.startsWith('video/')
  const isImage = file.type.startsWith('image/')
  if (!isImage && !isVideo) {
    throw new Error('Only images and videos are allowed.')
  }

  let fileToUpload = file
  let contentType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg')

  if (isImage) {
    if (file.size > MAX_POST_MEDIA_BYTES) {
      fileToUpload = await compressImageToMaxBytes(file, MAX_POST_MEDIA_BYTES)
      contentType = 'image/jpeg'
    }
  } else if (file.size > MAX_POST_MEDIA_BYTES) {
    fileToUpload = await compressVideoToMaxBytes(file, MAX_POST_MEDIA_BYTES, {
      onProgress: options?.onVideoCompressProgress,
    })
    contentType = 'video/mp4'
  }

  const isOutputJpeg = contentType === 'image/jpeg' || fileToUpload.type === 'image/jpeg'
  const fallbackExt = isVideo ? 'mp4' : isOutputJpeg ? 'jpg' : 'jpg'
  const rawExt = fileToUpload.name.includes('.')
    ? fileToUpload.name.split('.').pop() || fallbackExt
    : fallbackExt
  const ext = rawExt.replace(/[^a-z0-9]/gi, '').slice(0, 8) || fallbackExt
  const path = `post-media/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`
  const storageRef = ref(firebaseStorage, path)
  options?.onUploadStart?.()
  await uploadBytes(storageRef, fileToUpload, { contentType })
  const url = await getDownloadURL(storageRef)
  return { url, kind: isVideo ? 'video' : 'image' }
}
