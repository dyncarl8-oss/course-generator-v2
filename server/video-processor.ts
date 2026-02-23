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
    const listFilePath = path.join(tempDir, 'list.txt');

    try {
        console.log(`Downloading ${videoUrls.length} video segments for stitching...`);
        for (let i = 0; i < videoUrls.length; i++) {
            const tempFile = path.join(tempDir, `segment_${i}.mp4`);
            await downloadVideo(videoUrls[i], tempFile);
            tempFiles.push(tempFile);
        }

        // Create list.txt for FFmpeg concat demuxer
        // We use absolute paths to be safe, escaping single quotes if any
        const listContent = tempFiles.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(listFilePath, listContent);

        console.log(`Stitching segments using FFmpeg concat demuxer (stream copy)...`);
        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(listFilePath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions(['-c', 'copy'])
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .on('end', () => {
                    console.log('Stitching finished successfully');
                    // Cleanup temp files immediately after success
                    try {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                    } catch (cleanupErr) {
                        console.error('Failed to cleanup temp files after stitching:', cleanupErr);
                    }
                    resolve(outputPath);
                })
                .save(outputPath);
        });
    } catch (error) {
        console.error('Error in stitchVideos:', error);
        // Cleanup on error
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupErr) {
            console.error('Failed to cleanup temp files after error:', cleanupErr);
        }
        throw error;
    }
}
