const https = require('https');
const fs = require('fs');

async function getPlaylistContents(playlistId) {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    console.log(`Fetching ${url}...`);

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                try {
                    const regex = /var ytInitialData = ({.*?});<\/script>/s;
                    const match = html.match(regex);
                    if (!match) throw new Error("Could not find ytInitialData");
                    
                    const data = JSON.parse(match[1]);
                    const videos = [];
                    
                    // Navigate through the nested JSON structure
                    const contents = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
                    
                    contents.forEach(item => {
                        if (item.playlistVideoRenderer) {
                            const v = item.playlistVideoRenderer;
                            videos.push({
                                title: v.title.runs[0].text,
                                videoId: v.videoId,
                                position: v.index.simpleText
                            });
                        }
                    });
                    
                    resolve(videos);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

const playlists = {
    audios: 'PL1ZWur9ydxbRNuku84DLy3swy9ZqE3tqn',
    videos: 'PL1ZWur9ydxbSgM3TZb0DIOxsMC1QT-8he'
};

async function main() {
    try {
        const audioList = await getPlaylistContents(playlists.audios);
        const videoList = await getPlaylistContents(playlists.videos);
        
        const finalMapping = {
            audios: audioList,
            videos: videoList
        };
        
        fs.writeFileSync('youtube_mapping.json', JSON.stringify(finalMapping, null, 2));
        console.log("Successfully saved mapping to youtube_mapping.json");
        console.log(`Found ${audioList.length} audios and ${videoList.length} videos.`);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
