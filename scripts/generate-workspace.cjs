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

const workspaceData = srtFiles.map(filePath => {
  const name = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  return { name, raw };
});

console.log(`Baking ${workspaceData.length} files into ${OUTPUT_FILE}...`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(workspaceData));
console.log('Done!');
