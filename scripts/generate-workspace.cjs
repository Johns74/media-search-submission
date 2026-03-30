const fs = require('fs');
const path = require('path');

const SRT_DIR = path.join(__dirname, '..', 'SRT', 'SRTs');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'assets', 'workspace.json');

function getSRTFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getSRTFiles(filePath, fileList);
    } else if (file.endsWith('.srt')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

console.log('Scanning for SRT files in:', SRT_DIR);
const srtFiles = getSRTFiles(SRT_DIR);
console.log(`Found ${srtFiles.length} SRT files.`);

// Load YouTube mapping data
const mappingPath = path.join(__dirname, '..', 'youtube_mapping.json');
const youtubeMapping = fs.existsSync(mappingPath) ? JSON.parse(fs.readFileSync(mappingPath, 'utf8')) : null;

const workspaceData = srtFiles.map(filePath => {
  const name = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  let videoId = null;
  let category = 'Unknown';

  if (youtubeMapping) {
    // Determine category based on folder name
    const parentDir = path.basename(path.dirname(filePath));
    const isVideo = parentDir.toLowerCase().includes('video');
    const list = isVideo ? youtubeMapping.videos : youtubeMapping.audios;
    category = isVideo ? 'Video' : 'Audio';

    // Extraction Logic: Match by number in [box] or start of string
    const match = name.match(/\[(\d+)\]/) || name.match(/^[^\d]*(\d+)/);
    if (match) {
      const numStr = match[1].padStart(2, '0'); // Normalize 1 to 01
      const found = list.find(v => v.title.startsWith(numStr));
      if (found) {
        videoId = found.videoId;
      }
    }
  }

  return { name, raw, videoId, category };
});

console.log(`Baking ${workspaceData.length} files into ${OUTPUT_FILE}...`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(workspaceData));
console.log('Done!');
