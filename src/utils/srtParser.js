/**
 * Parses an SRT file string into an array of subtitle objects.
 * @param {string} data - The raw SRT file content.
 * @returns {Array<{index: number, start: string, end: string, text: string}>}
 */
export function parseSRT(data) {
  const subtitles = [];
  // Normalize line endings and split by double newline
  const blocks = data.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim());
    if (lines.length >= 3) {
      const index = parseInt(lines[0], 10);
      const times = lines[1].split(' --> ');
      if (times.length === 2) {
        const start = times[0];
        const end = times[1];
        const text = lines.slice(2).join(' ');
        if (!isNaN(index)) {
          subtitles.push({ index, start, end, text });
        }
      }
    }
  }

  return subtitles;
}
