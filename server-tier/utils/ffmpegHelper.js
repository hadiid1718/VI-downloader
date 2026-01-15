const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * FFmpeg Helper - Utility functions for audio/video merging
 */
class FFmpegHelper {
  /**
   * Check if FFmpeg is installed and available
   * @returns {Promise<boolean>} True if FFmpeg is available
   */
  static async isFFmpegAvailable() {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        ffmpeg.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Merge video and audio files using FFmpeg
   * @param {string} videoPath - Path to video file (video-only)
   * @param {string} audioPath - Path to audio file (audio-only)
   * @param {string} outputPath - Path for merged output file
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} Merge result
   */
  static async mergeVideoAudio(videoPath, audioPath, outputPath, onProgress = null) {
    return new Promise((resolve, reject) => {
      try {
        // Verify input files exist
        if (!fs.existsSync(videoPath)) {
          return reject(new Error(`Video file not found: ${videoPath}`));
        }

        if (!fs.existsSync(audioPath)) {
          return reject(new Error(`Audio file not found: ${audioPath}`));
        }

        // FFmpeg command: merge video and audio without re-encoding (copy codec)
        // -c:v copy -c:a copy: Copy codecs without re-encoding (fast)
        // -shortest: Stop encoding when the shortest input stream ends
        const args = [
          '-i', videoPath,              // Input video file
          '-i', audioPath,              // Input audio file
          '-c:v', 'copy',               // Copy video codec (no re-encoding)
          '-c:a', 'aac',                // Use AAC for audio codec
          '-shortest',                  // Stop at shortest stream
          '-y',                         // Overwrite output file without asking
          outputPath,                   // Output file
        ];

        const ffmpeg = spawn('ffmpeg', args);

        // Track progress by analyzing FFmpeg output
        let progressMatch = null;

        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();

          // FFmpeg outputs progress to stderr
          // Example: Duration: 00:10:30.50, start: 0.000000, bitrate: 2500 kb/s
          const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
          const timeMatch = output.match(/time=(\d+):(\d+):(\d+\.\d+)/);

          if (durationMatch && !progressMatch) {
            const hours = parseInt(durationMatch[1]);
            const minutes = parseInt(durationMatch[2]);
            const seconds = parseFloat(durationMatch[3]);
            progressMatch = hours * 3600 + minutes * 60 + seconds;
          }

          if (timeMatch && progressMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseFloat(timeMatch[3]);
            const currentTime = hours * 3600 + minutes * 60 + seconds;
            const progress = Math.min(100, Math.round((currentTime / progressMatch) * 100));

            if (onProgress) {
              onProgress({
                progress,
                status: 'merging',
                message: `Merging audio and video: ${progress}%`,
              });
            }
          }
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            // Verify output file was created
            if (fs.existsSync(outputPath)) {
              const fileSize = fs.statSync(outputPath).size;

              resolve({
                success: true,
                message: 'Video and audio merged successfully',
                filePath: outputPath,
                fileSize,
                fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
              });
            } else {
              reject(new Error('Merge completed but output file not found'));
            }
          } else {
            reject(new Error(`FFmpeg merge failed with exit code ${code}`));
          }
        });

        ffmpeg.on('error', (error) => {
          reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
        });

        // Set timeout for merge operation (15 minutes)
        setTimeout(() => {
          ffmpeg.kill();
          reject(new Error('FFmpeg merge operation timeout exceeded'));
        }, 15 * 60 * 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get video metadata using FFprobe (if available)
   * @param {string} filePath - Path to media file
   * @returns {Promise<object>} Video metadata
   */
  static async getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(filePath)) {
          return reject(new Error(`File not found: ${filePath}`));
        }

        const ffprobe = spawn('ffprobe', [
          '-v', 'error',
          '-show_format',
          '-show_streams',
          '-of', 'json',
          filePath,
        ]);

        let output = '';

        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });

        ffprobe.on('close', (code) => {
          if (code === 0) {
            try {
              const metadata = JSON.parse(output);
              resolve({
                success: true,
                metadata,
              });
            } catch (parseError) {
              reject(new Error(`Failed to parse FFprobe output: ${parseError.message}`));
            }
          } else {
            reject(new Error(`FFprobe failed with exit code ${code}`));
          }
        });

        ffprobe.on('error', (error) => {
          reject(new Error(`Failed to spawn FFprobe: ${error.message}`));
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          ffprobe.kill();
          reject(new Error('FFprobe operation timeout'));
        }, 30000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extract audio from a video file
   * @param {string} inputPath - Path to input video file
   * @param {string} outputPath - Path for output audio file
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} Extract result
   */
  static async extractAudio(inputPath, outputPath, onProgress = null) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(inputPath)) {
          return reject(new Error(`Input file not found: ${inputPath}`));
        }

        const args = [
          '-i', inputPath,
          '-q:a', '0',                  // Best audio quality
          '-map', 'a',                  // Select audio stream only
          '-y',                         // Overwrite output
          outputPath,
        ];

        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();
          const progressMatch = output.match(/time=(\d+):(\d+):(\d+\.\d+)/);

          if (progressMatch && onProgress) {
            const hours = parseInt(progressMatch[1]);
            const minutes = parseInt(progressMatch[2]);
            const seconds = parseFloat(progressMatch[3]);
            const message = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2)}`;

            onProgress({
              status: 'extracting',
              message: `Extracting audio: ${message}`,
            });
          }
        });

        ffmpeg.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputPath)) {
            const fileSize = fs.statSync(outputPath).size;

            resolve({
              success: true,
              message: 'Audio extracted successfully',
              filePath: outputPath,
              fileSize,
              fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
            });
          } else {
            reject(new Error(`Audio extraction failed with exit code ${code}`));
          }
        });

        ffmpeg.on('error', (error) => {
          reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
        });

        // Set timeout (10 minutes)
        setTimeout(() => {
          ffmpeg.kill();
          reject(new Error('Audio extraction timeout exceeded'));
        }, 10 * 60 * 1000);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = FFmpegHelper;
