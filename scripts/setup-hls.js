/**
 * HLS Adaptive Streaming Setup Script
 * Converts MP4 videos to HLS format with multiple bitrates
 * Requires: ffmpeg (system dependency)
 * 
 * Phase 1: Asset Pipeline Modernization
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const HLS_OUTPUT_DIR = path.join(ASSETS_DIR, 'hls');

// HLS quality renditions
const RENDITIONS = [
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2800k', audioBitrate: '128k' },
  { name: '480p', width: 854, height: 480, bitrate: '1400k', audioBitrate: '96k' },
  { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '64k' },
];

// Videos to convert
const VIDEOS = [
  'hero-video.mp4',
  'yeti-chase.mp4',
  'forest-monster-chase.mp4',
];

/**
 * Check if ffmpeg is available
 */
function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Create HLS output directory structure
 */
function createOutputDirs() {
  if (!fs.existsSync(HLS_OUTPUT_DIR)) {
    fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
  }
  
  // Create subdirectories for each video
  VIDEOS.forEach(video => {
    const videoName = path.basename(video, '.mp4');
    const videoDir = path.join(HLS_OUTPUT_DIR, videoName);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
  });
}

/**
 * Convert single MP4 to HLS with multiple renditions
 */
async function convertToHls(inputPath, outputDir) {
  const videoName = path.basename(inputPath, '.mp4');
  const playlistPath = path.join(outputDir, 'master.m3u8');
  
  console.log(`[HLS] Converting ${videoName}...`);
  
  // Build ffmpeg command for multiple renditions
  const ffmpegArgs = [
    '-i', inputPath,
    '-y', // Overwrite output files
  ];
  
  // Add encoding settings for each rendition
  const renditionPaths = [];
  RENDITIONS.forEach((rendition, index) => {
    const renditionPath = path.join(outputDir, `${rendition.name}.m3u8`);
    const segmentPath = path.join(outputDir, `${rendition.name}_%03d.ts`);
    renditionPaths.push({ name: rendition.name, path: renditionPath });
    
    ffmpegArgs.push(
      // Video filter for scaling
      '-filter:v:' + index, `scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2`,
      // Video codec
      '-c:v:' + index, 'libx264',
      '-b:v:' + index, rendition.bitrate,
      '-maxrate:v:' + index, rendition.bitrate,
      '-bufsize:v:' + index, parseInt(rendition.bitrate) * 2 + 'k',
      '-preset:v:' + index, 'fast',
      // Audio codec
      '-c:a:' + index, 'aac',
      '-b:a:' + index, rendition.audioBitrate,
      // HLS settings
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-hls_segment_filename:' + index, path.join(outputDir, `${rendition.name}_%03d.ts`),
      '-f', 'hls',
      '-hls_playlist_type', 'vod',
      '-master_pl_name', 'master_' + rendition.name + '.m3u8',
      '-map', '0:v',
      '-map', '0:a',
      renditionPath
    );
  });
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        // Create master playlist
        createMasterPlaylist(outputDir, videoName, renditionPaths);
        console.log(`[HLS] ✅ ${videoName} converted successfully`);
        resolve();
      } else {
        console.error(`[HLS] ❌ Failed to convert ${videoName}`);
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create master playlist that references all renditions
 */
function createMasterPlaylist(outputDir, videoName, renditionPaths) {
  const masterPath = path.join(outputDir, 'master.m3u8');
  
  let content = '#EXTM3U\n';
  content += '#EXT-X-VERSION:3\n';
  content += `# Created by ScaryGamesAI HLS Pipeline\n`;
  content += `# Video: ${videoName}\n\n`;
  
  RENDITIONS.forEach((rendition, index) => {
    const bandwidth = parseInt(rendition.bitrate) * 1000 + parseInt(rendition.audioBitrate) * 1000;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rendition.width}x${rendition.height},NAME="${rendition.name}"\n`;
    content += `${rendition.name}.m3u8\n\n`;
  });
  
  fs.writeFileSync(masterPath, content);
  console.log(`[HLS] Created master playlist: ${masterPath}`);
}

/**
 * Generate video poster image
 */
function generatePoster(inputPath, outputDir) {
  const videoName = path.basename(inputPath, '.mp4');
  const posterPath = path.join(outputDir, 'poster.jpg');
  
  try {
    execSync(`ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${posterPath}" -y`, {
      stdio: 'ignore'
    });
    console.log(`[HLS] Created poster: ${posterPath}`);
  } catch (e) {
    console.warn(`[HLS] Could not create poster for ${videoName}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('ScaryGamesAI - HLS Adaptive Streaming Pipeline');
  console.log('Phase 1: Asset Pipeline Modernization');
  console.log('='.repeat(60));
  
  // Check for ffmpeg
  if (!checkFfmpeg()) {
    console.error('[HLS] ❌ ffmpeg not found. Please install ffmpeg first.');
    console.error('[HLS]   Windows: winget install ffmpeg');
    console.error('[HLS]   macOS: brew install ffmpeg');
    console.error('[HLS]   Linux: apt install ffmpeg');
    process.exit(1);
  }
  
  console.log('[HLS] ✅ ffmpeg found');
  
  // Create output directories
  createOutputDirs();
  console.log('[HLS] ✅ Output directories created');
  
  // Process each video
  for (const video of VIDEOS) {
    const inputPath = path.join(ASSETS_DIR, video);
    
    if (!fs.existsSync(inputPath)) {
      console.warn(`[HLS] ⚠️ Video not found: ${inputPath}`);
      continue;
    }
    
    const videoName = path.basename(video, '.mp4');
    const outputDir = path.join(HLS_OUTPUT_DIR, videoName);
    
    try {
      await convertToHls(inputPath, outputDir);
      generatePoster(inputPath, outputDir);
    } catch (e) {
      console.error(`[HLS] ❌ Error processing ${video}:`, e.message);
    }
  }
  
  // Create index file for all HLS videos
  const indexPath = path.join(HLS_OUTPUT_DIR, 'index.json');
  const indexData = {
    created: new Date().toISOString(),
    videos: VIDEOS.map(video => {
      const name = path.basename(video, '.mp4');
      return {
        name,
        original: `/assets/${video}`,
        hls: `/assets/hls/${name}/master.m3u8`,
        poster: `/assets/hls/${name}/poster.jpg`,
        renditions: RENDITIONS.map(r => ({
          name: r.name,
          playlist: `/assets/hls/${name}/${r.name}.m3u8`,
          width: r.width,
          height: r.height,
          bitrate: r.bitrate,
        })),
      };
    }),
  };
  
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`[HLS] ✅ Created HLS index: ${indexPath}`);
  
  console.log('\n[HLS] ✅ HLS conversion complete!');
  console.log('[HLS] Videos are now available at /assets/hls/{video-name}/master.m3u8');
}

main().catch(err => {
  console.error('[HLS] Fatal error:', err);
  process.exit(1);
});