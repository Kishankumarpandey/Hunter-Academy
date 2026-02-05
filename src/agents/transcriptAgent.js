const { YoutubeTranscript } = require('youtube-transcript');

async function extractVideoData(videoUrl) {
    console.log("🕵️ Agent 1 (Transcript): Extracting data for:", videoUrl);
    let transcriptText = "";
    let metaData = { title: "Unknown Topic", author: "Unknown" };

    // 1. Transcript (Captions)
    try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
        // Limit text to 15k chars for AI token safety
        transcriptText = transcriptItems.map(i => i.text).join(' ').substring(0, 15000);
        console.log("✅ Transcript Extracted Successfully.");
    } catch (e) {
        console.warn("⚠️ No Captions Found. Switching to Fallback Mode.");
    }

    // 2. Metadata (Title) via NoEmbed
    try {
        const metaRes = await fetch(`https://noembed.com/embed?url=${videoUrl}`);
        const metaJson = await metaRes.json();
        metaData = { title: metaJson.title, author: metaJson.author_name };
    } catch (e) {
        console.warn("⚠️ Metadata extraction failed.");
    }

    return {
        text: transcriptText,
        title: metaData.title,
        fullContext: transcriptText 
            ? `Video Title: ${metaData.title}\nAuthor: ${metaData.author}\n\nTRANSCRIPT:\n${transcriptText}`
            : `Video Title: ${metaData.title}\nAuthor: ${metaData.author}\n\n(NOTE: Captions were unavailable. Generate based on Title.)`
    };
}

module.exports = { extractVideoData };