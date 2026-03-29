/**
 * Client-only: transcode to H.264/AAC MP4 with ffmpeg.wasm until size <= maxBytes.
 * Heavy (large download on first use, slow encode). Skip files above `MAX_VIDEO_COMPRESS_INPUT_BYTES` to reduce OOM risk.
 */

/** Refuse in-browser compression above this (approx. memory / time safety). */
export const MAX_VIDEO_COMPRESS_INPUT_BYTES = 900 * 1024 * 1024

const FFMPEG_CORE_VERSION = '0.12.6'
const OUTPUT_NAME = 'output.mp4'
/** Per-encode timeout (ms); long clips need headroom. */
const EXEC_TIMEOUT_MS = 60 * 60 * 1000

export type CompressVideoProgress = {
  phase: 'load' | 'encode'
  /** 0–1 when phase is `encode` (best-effort from ffmpeg). */
  ratio?: number
}

let ffmpegLoadPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null

function inputSuffix(file: File): string {
  const n = file.name.toLowerCase()
  if (n.endsWith('.mp4')) return 'mp4'
  if (n.endsWith('.webm')) return 'webm'
  if (n.endsWith('.mov') || n.endsWith('.qt')) return 'mov'
  if (n.endsWith('.m4v')) return 'm4v'
  return 'mp4'
}

async function getFFmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (typeof window === 'undefined') {
    throw new Error('Video compression requires a browser.')
  }
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ])
      const base = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      return ffmpeg
    })()
  }
  return ffmpegLoadPromise
}

type Attempt = { maxW: number; crf: number; audioKbps: number; stripAudio: boolean }

/** Ordered from mild to aggressive; each full transcode is expensive, so keep this list tight. */
const ATTEMPTS: Attempt[] = [
  { maxW: 1920, crf: 26, audioKbps: 128, stripAudio: false },
  { maxW: 1920, crf: 28, audioKbps: 112, stripAudio: false },
  { maxW: 1920, crf: 30, audioKbps: 96, stripAudio: false },
  { maxW: 1280, crf: 26, audioKbps: 112, stripAudio: false },
  { maxW: 1280, crf: 28, audioKbps: 96, stripAudio: false },
  { maxW: 1280, crf: 30, audioKbps: 96, stripAudio: false },
  { maxW: 1280, crf: 32, audioKbps: 80, stripAudio: false },
  { maxW: 960, crf: 28, audioKbps: 96, stripAudio: false },
  { maxW: 960, crf: 30, audioKbps: 80, stripAudio: false },
  { maxW: 854, crf: 30, audioKbps: 80, stripAudio: false },
  { maxW: 854, crf: 32, audioKbps: 64, stripAudio: false },
  { maxW: 720, crf: 32, audioKbps: 64, stripAudio: false },
  { maxW: 640, crf: 34, audioKbps: 64, stripAudio: false },
  { maxW: 640, crf: 36, audioKbps: 48, stripAudio: false },
  { maxW: 540, crf: 36, audioKbps: 48, stripAudio: false },
  { maxW: 480, crf: 38, audioKbps: 48, stripAudio: false },
  { maxW: 480, crf: 38, audioKbps: 0, stripAudio: true },
  { maxW: 426, crf: 40, audioKbps: 0, stripAudio: true },
  { maxW: 360, crf: 42, audioKbps: 0, stripAudio: true },
]

export async function compressVideoToMaxBytes(
  file: File,
  maxBytes: number,
  options?: {
    onProgress?: (p: CompressVideoProgress) => void
  }
): Promise<File> {
  if (typeof window === 'undefined') {
    throw new Error('Video compression requires a browser.')
  }
  if (file.size <= maxBytes) return file
  if (file.size > MAX_VIDEO_COMPRESS_INPUT_BYTES) {
    throw new Error(
      `This video is too large to compress in the browser (over ${Math.round(MAX_VIDEO_COMPRESS_INPUT_BYTES / (1024 * 1024))} MB). Use HandBrake, FFmpeg, or similar on your computer, then try again.`
    )
  }

  options?.onProgress?.({ phase: 'load' })
  const ffmpeg = await getFFmpeg()
  const { fetchFile } = await import('@ffmpeg/util')
  const suffix = inputSuffix(file)
  const inputPath = `in.${suffix}`

  const onProg = ({ progress }: { progress: number }) => {
    if (typeof progress === 'number' && !Number.isNaN(progress)) {
      options?.onProgress?.({ phase: 'encode', ratio: Math.min(1, Math.max(0, progress)) })
    }
  }
  ffmpeg.on('progress', onProg)

  try {
    await ffmpeg.writeFile(inputPath, await fetchFile(file))

    let lastSize = Infinity
    for (const a of ATTEMPTS) {
      options?.onProgress?.({ phase: 'encode', ratio: 0 })
      try {
        await ffmpeg.deleteFile(OUTPUT_NAME)
      } catch {
        /* noop */
      }

      const vf = `scale='min(${a.maxW},iw)':-2,format=yuv420p`
      const args: string[] = [
        '-i',
        inputPath,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        String(a.crf),
        '-vf',
        vf,
        '-movflags',
        '+faststart',
      ]
      if (a.stripAudio) {
        args.push('-an')
      } else {
        args.push('-c:a', 'aac', '-b:a', `${a.audioKbps}k`, '-ar', '44100')
      }
      args.push(OUTPUT_NAME)

      const code = await ffmpeg.exec(args, EXEC_TIMEOUT_MS)
      if (code !== 0) continue

      let data: Uint8Array
      try {
        data = (await ffmpeg.readFile(OUTPUT_NAME)) as Uint8Array
      } catch {
        continue
      }
      if (!data?.length) continue
      lastSize = data.byteLength
      if (data.byteLength <= maxBytes) {
        const base = file.name.replace(/\.[^.]+$/i, '') || 'video'
        const out = new Uint8Array(data.byteLength)
        out.set(data)
        return new File([out], `${base}.mp4`, {
          type: 'video/mp4',
          lastModified: Date.now(),
        })
      }
    }

    throw new Error(
      lastSize === Infinity
        ? 'Could not compress this video. Try a shorter clip or a different format.'
        : `Video is still about ${Math.round(lastSize / (1024 * 1024))} MB after compression. Try a shorter or lower-resolution source.`
    )
  } finally {
    ffmpeg.off('progress', onProg)
    try {
      await ffmpeg.deleteFile(inputPath)
    } catch {
      /* noop */
    }
    try {
      await ffmpeg.deleteFile(OUTPUT_NAME)
    } catch {
      /* noop */
    }
  }
}
