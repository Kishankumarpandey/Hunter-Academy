const google = require('googlethis');
const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function findWebGame(topic) {
    console.log(`🌍 Scout Agent: Analyzing the web for "${topic}" games...`);

    try {
        // Step 1: Search
        const query = `best interactive browser game to learn ${topic} online free`;
        const response = await google.search(query, { page: 0, safe: false, additional_params: { hl: 'en' } });

        // Step 2: Filter Bad Links
        const candidates = response.results.filter(res => {
            const url = res.url.toLowerCase();
            const blocked = ['wikipedia', 'youtube', 'pinterest', 'quora', 'reddit', 'stackoverflow', 'geeksforgeeks'];
            return !blocked.some(b => url.includes(b));
        }).slice(0, 6);

        if (candidates.length === 0) return null;

        // Step 3: AI Verification & Categorization
        console.log("🧠 Scout Agent: Verifying & Categorizing...");

        const prompt = `
        Analyze these search results for topic: "${topic}".
        Select the BEST interactive educational game.

        SEARCH RESULTS:
        ${JSON.stringify(candidates.map((c, i) => ({ id: i, title: c.title, url: c.url })))}

        TASK:
        1. Verify it is a REAL game.
        2. Assign a Category: "CS" (Coding), "ECE" (Electronics), "MATH", "PHYSICS", or "GENERAL".
        3. Generate 3 tags.

        Return JSON ONLY:
        { 
            "found": true, 
            "title": "Game Name", 
            "url": "URL", 
            "category": "CS",
            "tags": ["tag1", "tag2", "tag3"],
            "reason": "Why is this good?" 
        }
        OR { "found": false }
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const decision = JSON.parse(completion.choices[0].message.content);

        if (decision.found) {
            console.log(`✅ Scout Agent Verified: "${decision.title}" [Cat: ${decision.category}]`);
            return {
                name: decision.title,
                url: decision.url,
                tags: decision.tags,
                category: decision.category, // Important for DB save
                description: decision.reason,
                isExternal: true
            };
        } else {
            return null;
        }

    } catch (error) {
        console.error("⚠️ Scout Error:", error.message);
        return null;
    }
}

module.exports = { findWebGame };