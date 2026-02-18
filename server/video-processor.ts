import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Downloads a video from a URL to a temporary file
 */
async function downloadVideo(url: string, destPath: string): Promise<void> {
    const isGoogleUrl = url.includes('generativelanguage.googleapis.com');
    const headers: Record<string, string> = {};

    if (isGoogleUrl && process.env.GEMINI_API_KEY) {
        headers['x-goog-api-key'] = process.env.GEMINI_API_KEY;
    }

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers
    });
    await streamPipeline(response.data, fs.createWriteStream(destPath));
}

/**
 * Stitches multiple video files into a single video
 */
export async function stitchVideos(videoUrls: string[], outputPath: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', 'video_stitching_' + Date.now());
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFiles: string[] = [];

    try {
        console.log(`Downloading ${videoUrls.length} video segments for stitching...`);
        for (let i = 0; i < videoUrls.length; i++) {
            const tempFile = path.join(tempDir, `segment_${i}.mp4`);
            await downloadVideo(videoUrls[i], tempFile);
            tempFiles.push(tempFile);
        }

        console.log(`Stitching segments using FFmpeg...`);
        return new Promise((resolve, reject) => {
            const command = ffmpeg();

            tempFiles.forEach(file => {
                command.input(file);
            });

            command
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .on('end', () => {
                    console.log('Stitching finished successfully');
                    resolve(outputPath);
                })
                .mergeToFile(outputPath, tempDir);
        });
    } catch (error) {
        console.error('Error in stitchVideos:', error);
        throw error;
    } finally {
        // Cleanup temp files
        // In a real scenario, we'd delete them, but for now we'll keep them short-term
        // setTimeout(() => {
        //   fs.rmSync(tempDir, { recursive: true, force: true });
        // }, 60000);
    }
}
