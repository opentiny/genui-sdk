import type { Plugin } from 'vite'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
// @ts-ignore
import ffmpeg from 'fluent-ffmpeg'

interface VideoCompressOptions {
  quality?: number
  codec?: string
  skipIfExists?: boolean
}

let ffmpegPath: string | null = null

function getFFmpegPath(): string | null {
  if (ffmpegPath) {
    return ffmpegPath
  }

  try {
    ffmpegPath = ffmpegInstaller.path
    ffmpeg.setFfmpegPath(ffmpegPath)
    return ffmpegPath
  } catch (error) {
    console.warn('[vite-plugin-video-compress] Failed to load @ffmpeg-installer/ffmpeg, trying system ffmpeg')
    try {
      ffmpegPath = 'ffmpeg'
      ffmpeg.setFfmpegPath(ffmpegPath)
      return ffmpegPath
    } catch {
      return null
    }
  }
}

function compressVideo(inputPath: string, outputPath: string, options: VideoCompressOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const { quality = 28, codec = 'libx264' } = options

    if (!existsSync(inputPath)) {
      reject(new Error(`Input video file not found: ${inputPath}`))
      return
    }

    if (options.skipIfExists && existsSync(outputPath)) {
      resolve()
      return
    }

    const ffmpegPath = getFFmpegPath()
    if (!ffmpegPath) {
      reject(new Error('FFmpeg not found. Please install @ffmpeg-installer/ffmpeg or system ffmpeg.'))
      return
    }

    ffmpeg(inputPath)
      .videoCodec(codec)
      .videoBitrate(0)
      .addOption('-crf', quality.toString())
      .addOption('-preset', 'medium')
      .audioCodec('aac')
      .audioBitrate('128k')
      .addOption('-movflags', '+faststart')
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('[vite-plugin-video-compress] FFmpeg command: ' + commandLine)
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.log(`[vite-plugin-video-compress] Processing: ${Math.round(progress.percent)}% done`)
        }
      })
      .on('end', () => {
        resolve()
      })
      .on('error', (err: Error) => {
        reject(err)
      })
      .run()
  })
}

export function vitePluginVideoCompress(options: VideoCompressOptions = {}): Plugin {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv']

  return {
    name: 'vite-plugin-video-compress',
    enforce: 'pre',
    async generateBundle(_options, bundle) {
      const ffmpegPath = getFFmpegPath()
      if (!ffmpegPath) {
        console.warn('[vite-plugin-video-compress] FFmpeg is not available. Skipping video compression.')
        console.warn('[vite-plugin-video-compress] Please install @ffmpeg-installer/ffmpeg or system ffmpeg.')
        return
      }

      const videoAssets: Array<{ name: string; fileName: string; source: Buffer | Uint8Array }> = []

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'asset') {
          const ext = path.extname(fileName).toLowerCase()
          if (videoExtensions.includes(ext)) {
            const source = chunk.source
            const buffer = Buffer.isBuffer(source) ? source : Buffer.from(source)
            videoAssets.push({
              name: fileName,
              fileName: chunk.fileName || fileName,
              source: buffer
            })
          }
        }
      }

      if (videoAssets.length === 0) {
        return
      }

      console.log(`[vite-plugin-video-compress] Found ${videoAssets.length} video file(s) to compress`)

      const tempDir = path.resolve(process.cwd(), 'node_modules/.vite-video-temp')
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true })
      }

      for (const asset of videoAssets) {
        try {
          const tempInputPath = path.join(tempDir, `input_${asset.name}`)
          const tempOutputPath = path.join(tempDir, `output_${asset.name}`)

          const inputBuffer = Buffer.isBuffer(asset.source) ? asset.source : Buffer.from(asset.source)
          writeFileSync(tempInputPath, inputBuffer as any)

          console.log(`[vite-plugin-video-compress] Compressing: ${asset.name}`)
          await compressVideo(tempInputPath, tempOutputPath, {
            ...options,
            skipIfExists: false
          })

          const compressedBuffer = readFileSync(tempOutputPath)
          const originalSize = asset.source.length
          const compressedSize = compressedBuffer.length
          const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(2)

          console.log(`[vite-plugin-video-compress] Compressed ${asset.name}: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`)

          const bundleAsset = bundle[asset.fileName]
          if (bundleAsset && bundleAsset.type === 'asset') {
            bundleAsset.source = compressedBuffer as any
          }

          unlinkSync(tempInputPath)
          unlinkSync(tempOutputPath)
        } catch (error) {
          console.error(`[vite-plugin-video-compress] Failed to compress ${asset.name}:`, error)
        }
      }
    },
  }
}

