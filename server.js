require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const Groq = require('groq-sdk');
const { YoutubeTranscript } = require('youtube-transcript');

// 🔥 NEW: Import Orchestrator (Agar file banayi hai to ye load hoga, nahi to error ignore karega)
let orchestrator = null;
try {
    orchestrator = require('./src/core/orchestrator');
} catch (e) {
    console.log("⚠️ OWL Orchestrator files not found. Creating server without it.");
}

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
// 🚀 NEW: OWL SYSTEM ROUTE (ADDITION)
// =================================================================
app.post('/api/process-video', async (req, res) => {
    if (!orchestrator) return res.status(500).json({ error: "Orchestrator not configured" });
    const { videoUrl } = req.body;
    try {
        const result = await orchestrator.processVideo(videoUrl);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// =================================================================
// ⚖️ JUDGE SYSTEM (XP & VALIDATION)
// =================================================================
app.post('/api/validate-action', async (req, res) => {
    try {
        if (!orchestrator) return res.status(500).json({ error: "System Offline" });
        const result = await orchestrator.validatePlayerAction(req.body);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Judge Error" });
    }
});

// =================================================================
// 🔄 NEXT LEVEL SYSTEM (VIDEO ROTATION)
// =================================================================
app.post('/api/next-mission', async (req, res) => {
    try {
        if (!orchestrator) return res.status(500).json({ error: "System Offline" });
        const result = await orchestrator.getNextLevel();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: "Rotation Error" });
    }
});
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

        // 1. Get Content
        if (videoUrl) {
            console.log(`📡 Extracting Transcript for Notes: ${videoUrl}`);
            const transcript = await extractVideoData(videoUrl);
            if (transcript) {
                contentToAnalyze = transcript.substring(0, 25000); 
            }
        }

        // Fallback
        if ((!contentToAnalyze || contentToAnalyze.length < 50) && topic) {
            contentToAnalyze = topic;
        } else if (!contentToAnalyze) {
            return res.status(400).json({ error: "Could not fetch transcript. Please use manual mode." });
        }

        console.log(">> Generating NotebookLM Style Notes...");

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            messages: [
                { 
                    role: 'system', 
                    content: `You are an intelligent AI Study Guide Generator modeled after Google's NotebookLM. 
                    
Your goal is to convert any technical content into a **Deep Dive Academic Guide** that sounds like a knowledgeable professor or podcast host is walking the student through the topic. Make it engaging, intuitive, and educational.

📚 Style Rules:
- Use simple, clear language but explain deeply.
- Use analogies to make difficult topics easier.
- Write as if it will be converted to audio.
- Insert helpful visual cues using tags like: [Image of XYZ Circuit], [Image of Formula Plot].

🧠 Output Rules:
- Output STRICTLY valid JSON. No markdown. No extra commentary.
- No \`\`\` tags or "Here is your output" text.

🧾 Structure:
{
  "title": "Catchy but Academic Title",
  "summary": "Begin with: 'In this session, we explore...'",
  "sections": [
    {
      "heading": "🔥 Core Concept: Name",
      "content": "Explain what it is, how it works, and why it matters. Use bullet-style insights and analogies if needed. Add visual tag where possible."
    },
    {
      "heading": "🛠️ Real World Application",
      "content": "Explain how this topic is used in real projects or products. Walk through one small example if possible."
    }
  ],
  "keyTakeaways": [
    "📌 Key insight 1",
    "📌 Key insight 2",
    "📌 Key insight 3"
  ]
}
`
                },
                { 
                    role: 'user', 
                    content: `Analyze the following content and generate a NotebookLM-style guide:
---
${contentToAnalyze}
---`
                }
            ],
            response_format: { type: "json_object" }
        });

        const aiResponse = completion.choices[0]?.message?.content;
        if (!aiResponse) throw new Error("AI returned empty");

        // Safe Parse
        const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
        const notes = JSON.parse(cleanJson);
        
        return res.json(notes);

    } catch (error) {
        console.error('Error in /generate-notes:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
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

app.post('/match-game', async (req, res) => {
    try {
        const { videoTitle } = req.body;
        const title = videoTitle ? videoTitle.toLowerCase() : "";
        
        console.log(`🔎 Master Agent Scanning for: "${title}"`);

        // Original Path kept as per your request
        const libraryPath = path.join(__dirname, 'data', 'game-library.json');
        console.log("🔍 SERVER LOOKING AT PATH:", libraryPath);
        if (!fs.existsSync(libraryPath)) {
            // ❌ अगर फाइल नहीं है, तो कुछ मत भेजो (null)
            return res.json(null);
        }

        const gameLib = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

        console.log("📂 Loaded Categories:", Object.keys(gameLib));
        console.log("📂 CS Games Count:", gameLib["CS"] ? gameLib["CS"].length : 0);
        
        // 🔥 CHANGE: पहले Default "game-lab.html" था, अब इसे null कर दिया
        let matchedGame = null; 

        Object.keys(gameLib).forEach(category => {
            gameLib[category].forEach(game => {
                if (game.tags.some(tag => title.includes(tag.toLowerCase()))) {
                    matchedGame = game;
                }
            });
        });

        if (matchedGame) {
            console.log(`✅ MATCH FOUND: ${matchedGame.name}`);
            res.json(matchedGame);
        } else {
            console.log("⚠️ NO MATCH FOUND. Staying on page.");
            res.json(null); // कोई गेम नहीं मिला तो null भेजो
        }

    } catch (error) {
        console.error("❌ Match-Game Error:", error);
        res.status(500).json(null);
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
// =================================================================
// 🏛️ MODULE A: THE ARCHITECT (BLUEPRINT GENERATOR)
// =================================================================
app.post('/generate-blueprint', async (req, res) => {
    try {
        const { syllabus, careerGoal, hoursPerDay, durationWeeks } = req.body;
        
        console.log(`🏛️ ARCHITECT: Designing ${durationWeeks}-week plan for ${careerGoal}...`);

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are the **Grandmaster Architect** of an Elite Hunter Academy.
                    
                    **OBJECTIVE**: 
                    Convert raw college syllabus into a strategic ${durationWeeks}-week "Hunter Growth Blueprint" optimized for the goal: "${careerGoal}".

                    **ANALYSIS RULES**:
                    1. **Filter Noise**: Ignore generic intro text in syllabus. Focus on topics.
                    2. **Prioritize**: Tag topics as "CORE" (Essential for ${careerGoal}) or "SUPPORT" (Exam only).
                    3. **Connect**: Explain WHY a topic aids the career goal.
                    4. **Project-Based**: Every 4 weeks, suggest a Mini-Boss Project combining learned topics.

                    **STRICT JSON OUTPUT FORMAT**:
                    {
                        "blueprint_id": "unique_id",
                        "strategy_summary": "A 2-line fierce motivational summary of this roadmap.",
                        "exam_mode_strategy": "How to handle university exams while focusing on career.",
                        "roadmap": [
                            {
                                "week": 1,
                                "theme": "Week Title (e.g. The Awakening of Logic)",
                                "focus_area": "Subject Name / Core Concept",
                                "topics": [
                                    {
                                        "name": "Topic Name",
                                        "importance": "HIGH/MED/LOW",
                                        "tag": "CAREER-CORE", 
                                        "reason": "Why this matters for ${careerGoal} (1 sentence)."
                                    }
                                ],
                                "mini_project_idea": "Simple weekly task (e.g. Build a logic gate simulator)."
                            }
                            // ... Generate for all ${durationWeeks} weeks
                        ]
                    }
                    ` 
                },
                {
                    role: "user",
                    content: `
                    **HUNTER DATA**:
                    - Career Goal: ${careerGoal}
                    - Study Capacity: ${hoursPerDay} hours/day
                    - Semester Duration: ${durationWeeks} weeks
                    
                    **RAW SYLLABUS TEXT**:
                    ${syllabus.substring(0, 20000)} 
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
        console.error("Architect Error:", error);
        res.status(500).json({ error: "Blueprint creation failed. The System is unstable." });
    }
});


// =================================================================
// 📅 MODULE B: THE NAVIGATOR (DAILY PLANNER)
// =================================================================
app.post('/generate-daily-plan', async (req, res) => {
    try {
        const { currentWeekData, completedTopics, hoursPerDay, mood } = req.body;
        
        console.log(`📅 NAVIGATOR: Generating Daily Mission... (Mood: ${mood})`);

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are the Daily Tactical AI.
                    
                    **GOAL**: Create a specific, executable study plan for TODAY based on the Weekly Blueprint.
                    
                    **LOGIC**:
                    1. Look at Week's Topics. Remove topics already in 'completedTopics'.
                    2. Select enough topics to fill ${hoursPerDay} hours.
                    3. If Mood is 'Low' (1-2), suggest lighter topics or videos. If 'High' (4-5), suggest Core concepts.
                    
                    **OUTPUT JSON**:
                    {
                        "daily_quote": "A short Hunter-style motivation line.",
                        "focus_mode": "Deep Work / Quick Review / Practical",
                        "tasks": [
                            {
                                "id": "t1",
                                "title": "Topic Name",
                                "type": "Theory/Video/Practice",
                                "duration_min": 45,
                                "reason": "Why this fits today's goal."
                            }
                        ],
                        "wellness_tip": "Specific advice based on mood."
                    }` 
                },
                {
                    role: "user",
                    content: `
                    Week Data: ${JSON.stringify(currentWeekData)}
                    Completed: ${JSON.stringify(completedTopics)}
                    Daily Hours: ${hoursPerDay}
                    Student Mood: ${mood}/5
                    `
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);
        res.json(data);

    } catch (error) {
        console.error("Navigator Error:", error);
        res.status(500).json({ error: "Daily Plan generation failed." });
    }
});