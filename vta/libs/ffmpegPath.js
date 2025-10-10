// vta/libs/ffmpegPath.js
// Ensures fluent-ffmpeg uses the correct FFmpeg binary path

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

// Set FFmpeg path if available
export function setFfmpegPath() {
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('✅ FFmpeg path set successfully');
  } else {
    console.warn('⚠️ ffmpeg-static binary not found. Make sure FFmpeg is installed on your system.');
  }
}

export { ffmpeg, ffmpegPath };
