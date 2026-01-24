require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk'); 
const { YoutubeTranscript } = require('youtube-transcript');

// 🔥 SAFETY SHIELD: Crash Handler
process.on('uncaughtException', (err) => {
    console.error('⚠️ CRITICAL ERROR (Server kept running):', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ UNHANDLED REJECTION (Server kept running):', reason);
});

const app = express();
const port = process.env.PORT || 3001; // Port 3001 (Safe)

app.use(cors());
app.use(express.json());

// --------------------------------------------------------
// ⚠️ FIX 1: Duplicate Static Line Removed
// --------------------------------------------------------
app.use(express.static(__dirname)); // HTML/JS ke liye
app.use('/assets', express.static(path.join(__dirname, 'assets'))); // Audio/Images ke liye

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =================================================================
// 🛠️ HELPER: ROBUST VIDEO DATA EXTRACTOR
// =================================================================
async function extractVideoData(videoUrl) {
    console.log("🕵️ EXTRACTING DATA FOR:", videoUrl);
    let transcriptText = "";
    let metaData = { title: "Unknown Topic", author: "Unknown" };

    // 1. Try Fetching Transcript (Captions)
    try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
        transcriptText = transcriptItems.map(i => i.text).join(' ').substring(0, 25000); // 25k chars limit
        console.log("✅ Transcript Extracted Successfully.");
    } catch (e) {
        console.warn("⚠️ No Captions Found. Switching to Fallback Mode.");
    }

    // 2. Fetch Metadata (Title/Author) via NoEmbed (Backup Plan)
    try {
        const metaRes = await fetch(`https://noembed.com/embed?url=${videoUrl}`);
        const metaJson = await metaRes.json();
        metaData = { title: metaJson.title, author: metaJson.author_name };
    } catch (e) {
        console.warn("⚠️ Metadata extraction failed.");
    }

    // 3. Return Combined Data
    if (transcriptText) {
        return `Video Title: ${metaData.title}\nAuthor: ${metaData.author}\n\nTRANSCRIPT:\n${transcriptText}`;
    } else {
        return `Video Title: ${metaData.title}\nAuthor: ${metaData.author}\n\n(NOTE: Captions were unavailable. Generate content based strictly on the Title: "${metaData.title}" and general knowledge of this topic.)`;
    }
}

// =================================================================
// 1. GENERATE QUIZ (DUNGEON GATE) - STRICT ENGINEERING MODE 🧠
// =================================================================
app.post('/generate-dungeon', async (req, res) => {
    try {
        const { videoUrl, transcriptText } = req.body;
        let contentToAnalyze = "";

        if (transcriptText && transcriptText.length > 50) {
            contentToAnalyze = transcriptText;
        } else if (videoUrl) {
            contentToAnalyze = await extractVideoData(videoUrl);
        } else {
            return res.status(400).json({ error: "No Input Provided!" });
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `
                    You are an expert **Engineering Professor**. 
                    
                    **CRITICAL VISUALIZATION RULE**:
                    Whenever a diagram, waveform, circuit, or physical component is mentioned, you MUST insert a visualization tag strictly in this format:
                    
                    
                    
                    ❌ DO NOT use stars (****) or bold text for images.
                    ✅ CORRECT: "The voltage rises. 

[Image of sinusoidal waveform]
"
                    
                    **CONTEXT RULES**:
                    1. DOMAIN LOCKED: Engineering/Physics/CS only.
                    2. OUTPUT: Strictly valid JSON.
                    ` 
                },
                {
                    role: "user",
                    content: `
                    Analyze this content and generate a Quiz:
                    ---
                    ${contentToAnalyze}
                    ---
                    
                    TASK:
                    1. **Summary**: 5-7 bullet points summarizing the technical concepts. 
                        - Use 

[Image of X]
 tag for diagrams.
                    2. **Questions**: 5 Multiple Choice Questions testing technical understanding.

                    STRICT JSON FORMAT:
                    {
                        "summary": ["Point 1...", "Point 2 

[Image of X]
..."],
                        "questions": [
                            { "id": 1, "question": "Technical Question?", "options": ["A", "B", "C", "D"], "correctIndex": 0 }
                        ]
                    }
                    `
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);
        res.json(data);

    } catch (error) {
        console.error("Dungeon Error:", error);
        res.status(500).json({ error: "System Failure: " + error.message });
    }
});

// =================================================================
// 2. GENERATE NOTES (STRICT ENGINEERING MODE) 🧠
// =================================================================
app.post('/generate-notes', async (req, res) => {
    try {
        const { videoUrl, topic } = req.body;
        let contentToAnalyze = "";

        if (videoUrl) {
            contentToAnalyze = await extractVideoData(videoUrl);
        } else {
            contentToAnalyze = topic || "General Engineering Concept";
        }

        console.log(">> Generating Strictly Engineering Notes...");

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `
                    You are a strict **University Engineering Professor**. 
                    
                    **CRITICAL INSTRUCTIONS**:
                    1. **CONTEXT LOCK**: Always assume the context is **ACADEMIC & ENGINEERING**. 
                    2. **OUTPUT**: Strictly valid JSON.
                    ` 
                },
                {
                    role: "user",
                    content: `
                    Create detailed study notes for this engineering topic: 
                    ---
                    ${contentToAnalyze}
                    ---
                    
                    **STRUCTURE**:
                    1. **Title**: Academic Title.
                    2. **Summary**: Technical overview (TL;DR).
                    3. **Sections**: 3-4 deep technical sections using bullet points.
                        - Use  tags for circuit diagrams, waveforms, block diagrams.
                    4. **Key Takeaways**: Core engineering principles.

                    STRICT JSON FORMAT:
                    {
                        "title": "Topic Name",
                        "summary": "Technical summary...",
                        "sections": [
                            { 
                                "heading": "1. Concept Name", 
                                "content": "• Detail 1...\n• Detail 2... 

[Image of circuit diagram]
" 
                            }
                        ],
                        "keyTakeaways": ["Rule 1", "Formula 1"]
                    }
                    `
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);
        res.json(data);

    } catch (error) {
        console.error("Notes Error:", error);
        res.status(500).json({ error: "Engineering Database Locked." });
    }
});

// =================================================================
// 3. GENERATE PROJECTS (GUILD)
// =================================================================
app.post('/generate-projects', async (req, res) => {
    try {
        const { topic } = req.body;
        console.log(">> GUILD REQUEST:", topic);

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Hunter Guild Master. Analyze skills." },
                {
                    role: "user",
                    content: `
                    Topic: "${topic}".
                    Generate 3 Projects (E, B, S Rank).
                    
                    Strict JSON Output:
                    {
                        "projects": [
                            {
                                "rank": "E-RANK",
                                "title": "Title",
                                "desc": "Description",
                                "requiredSkills": ["Skill A"],
                                "status": "OPEN" 
                            },
                            {
                                "rank": "B-RANK",
                                "title": "Title",
                                "desc": "Description",
                                "requiredSkills": ["Skill A", "Skill B"],
                                "status": "WARNING"
                            },
                            {
                                "rank": "S-RANK",
                                "title": "Title",
                                "desc": "Description",
                                "requiredSkills": ["Skill A", "Skill B", "Skill C"],
                                "status": "LOCKED"
                            }
                        ]
                    }
                    `
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);
        res.json(data.projects);

    } catch (error) {
        console.error("Project Error:", error);
        res.status(500).json({ error: "Guild Closed." });
    }
});

// =================================================================
// 4. GENERATE ROADMAP (WITH RESOURCES LINKS) 🧠
// =================================================================
app.post('/generate-roadmap', async (req, res) => {
    try {
        const { role } = req.body; 
        
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are the Grandmaster Architect. Create a structured "Hunter Class Advancement" path.
                    
                    STRICT JSON FORMAT (NO MARKDOWN):
                    {
                        "role": "Role Name",
                        "levels": [
                            {
                                "rank": "E-RANK (Beginner)",
                                "focus": "Foundations",
                                "skills": ["Skill 1", "Skill 2"],
                                "resources": [
                                    {"name": "Best Crash Course (YT)", "type": "video"},
                                    {"name": "Official Docs", "type": "doc"}
                                ],
                                "project": { "title": "Mini Project", "desc": "One line desc" }
                            },
                            {
                                "rank": "B-RANK (Intermediate)",
                                "focus": "Core Logic",
                                "skills": ["Skill A", "Skill B"],
                                "resources": [
                                    {"name": "Advanced Guide", "type": "article"}
                                ],
                                "project": { "title": "Major Project", "desc": "One line desc" }
                            },
                            {
                                "rank": "S-RANK (Advanced)",
                                "focus": "Mastery",
                                "skills": ["Expert Skill 1"],
                                "resources": [
                                    {"name": "System Design Video", "type": "video"}
                                ],
                                "project": { "title": "Boss Project", "desc": "One line desc" }
                            }
                        ]
                    }` 
                },
                {
                    role: "user",
                    content: `Create a detailed roadmap for: "${role}". Include real-world study resources.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        let rawContent = completion.choices[0].message.content;
        rawContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(rawContent);
        res.json(data);

    } catch (error) {
        console.error("Roadmap Error:", error);
        res.status(500).json({ error: "Oracle connection failed." });
    }
});

// =================================================================
// 🤖 AI SHADOW SOLDIER (TACTICAL TEACHER MODE)
// =================================================================
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            messages: [
                {
                    role: "system",
                    content: `
                    You are IGRIS, an elite Shadow Commander and Master Engineer.
                    Your job is to TEACH concepts clearly like an expert teacher.

                    TEACHING FLOW (STRICT):
                    1. Start with a simple real-life analogy.
                    2. Explain the core concept simply.
                    3. Break into 3-6 bullet steps.
                    4. If visualization is needed, insert: 
                    5. Give real engineering usage.
                    6. End with one-line summary.

                    OUTPUT MUST BE PURE HTML USING THESE:
                    <div class="tactical-analysis"><strong>TACTICAL ANALYSIS:</strong> Explanation</div>
                    <ul class="strike-points"><li>Point</li></ul>
                    <div class="final-blow"><strong>FINAL BLOW:</strong> Summary</div>
                    No markdown. Only HTML.
                    `
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        const reply = completion.choices[0].message.content;
        res.json({ reply });

    } catch (error) {
        console.error("AI Error:", error.message);
        res.status(500).json({ error: "Igris is regrouping..." });
    }
});

// =================================================================
// 🎮 GAMIFICATION ENGINE (VISUAL RUNE LINK)
// -----------------------------------------------------------------
// ⚠️ FIX 2: Updated to include 'visual_prompt' for the new Game Lab
// =================================================================
app.post('/generate-game-data', async (req, res) => {
    try {
        const { topic } = req.body; // User topic dega (e.g., "React Hooks")
        console.log(">> 🎲 GENERATING GAME DATA FOR:", topic);

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are a Visual Game Designer. Convert the topic into a "Matching Game" dataset.
                    
                    STRICT JSON FORMAT:
                    {
                        "gameTitle": "Creative Title",
                        "pairs": [
                            { 
                                "id": 1, 
                                "term": "Short Term (e.g. CPU)", 
                                "def": "Definition (e.g. Central Processing Unit)",
                                "visual_prompt": "Cyberpunk style illustration of [Term], glowing neon, 8k render"
                            },
                            { "id": 2, "term": "...", "def": "...", "visual_prompt": "..." },
                            { "id": 3, "term": "...", "def": "...", "visual_prompt": "..." },
                            { "id": 4, "term": "...", "def": "...", "visual_prompt": "..." },
                            { "id": 5, "term": "...", "def": "...", "visual_prompt": "..." }
                        ]
                    }` 
                },
                {
                    role: "user",
                    content: `Topic: "${topic}". Create 6 matching pairs with visual prompts.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);
        res.json(data);

    } catch (error) {
        console.error("Game Gen Error:", error);
        res.status(500).json({ error: "Game Engine Failed" });
    }
});

// =================================================================
// 🚀 START SERVER (ROBUST MODE)
// =================================================================
const server = app.listen(port, () => {
    console.log(`\n✅ HUNTER SERVER ONLINE: http://localhost:${port}`);
    console.log(`👉 All Systems Active`);
    console.log(`👉 Waiting for commands...\n`);
});

// 🔥 Handle Port Conflicts (EADDRINUSE)
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n⚠️ FATAL ERROR: Port ${port} is BUSY!`);
        console.error(`👉 Solution: Task Manager mein jao aur 'node.exe' ko band karo.\n`);
    } else {
        console.error("⚠️ SERVER CRASHED:", e);
    }
    process.exit(1);
});