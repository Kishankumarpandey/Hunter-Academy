require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk'); 
const { YoutubeTranscript } = require('youtube-transcript');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- DEMO DATA ---
const DEMO_TRANSCRIPT = `
    Digital electronics is the study of electronic circuits that are used to process and control digital signals. 
    Binary Number System: The most common system used in digital electronics is the binary system, which uses only two digits: 0 and 1. 
    Logic Gates: These are the fundamental building blocks of digital circuits. The three basic logic gates are AND, OR, and NOT.
    Combination of these gates can create complex circuits like NAND, NOR, XOR, and XNOR.
    Boolean Algebra: A branch of algebra used to analyze and simplify digital logic circuits.
`;

// =================================================================
// 1. GENERATE QUIZ (DUNGEON) - Updated for Visual Summaries
// =================================================================
app.post('/generate-dungeon', async (req, res) => {
    try {
        const { videoUrl, transcriptText } = req.body;
        let fullTranscript = "";

        if (transcriptText && transcriptText.length > 50) {
            fullTranscript = transcriptText;
        } else if (videoUrl) {
            if (videoUrl.includes("M0mx8S05v60")) {
                fullTranscript = DEMO_TRANSCRIPT;
            } else {
                try {
                    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
                    fullTranscript = transcriptItems.map(i => i.text).join(' ');
                } catch (err) {
                    return res.status(400).json({ error: "SCRAPING ERROR. Please use Manual Mode." });
                }
            }
        } else {
            return res.status(400).json({ error: "No Input Provided!" });
        }

        fullTranscript = fullTranscript.replace(/\[Music\]|\[Applause\]/g, ' ').substring(0, 20000);

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are the Hunter System. Output strictly JSON." },
                {
                    role: "user",
                    content: `
                    Analyze this lecture text strictly in order of concepts: "${fullTranscript}"
                    
                    TASK:
                    1. Generate 5-7 "summary" points. 
                       - **CRITICAL**: If a point describes a physical object, a circuit, a biological process, or a flow, append a diagram tag: .
                       - Example: "Mitosis splits the cell. 

[Image of stages of mitosis diagram]
"
                    2. Generate 5 MCQ "questions" that appear sequentially as the lecture progresses.

                    STRICT JSON FORMAT:
                    {
                        "summary": ["Point 1...", "Point 2
..."],
                        "questions": [
                            { "id": 1, "question": "Q?", "options": ["A", "B", "C", "D"], "correctIndex": 0 }
                        ]
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
        console.error("Dungeon Error:", error);
        res.status(500).json({ error: "System Failure: " + error.message });
    }
});

// =================================================================
// 2. GENERATE PROJECTS WITH SKILL CHECK (ADVANCED)
// =================================================================
app.post('/generate-projects', async (req, res) => {
    try {
        const { topic } = req.body;
        console.log(">> GUILD REQUEST: Skill Check for", topic);

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are the Hunter Guild System. You analyze skill gaps." },
                {
                    role: "user",
                    content: `
                    Current Study Topic: "${topic}".
                    
                    Generate 3 Projects (E, B, S Rank).
                    For each project, perform a "Skill Scan":
                    1. List "requiredSkills" (e.g., Loops, Arrays, OOP).
                    2. Determine "status":
                       - "OPEN": If the Current Topic is sufficient.
                       - "WARNING": If it requires concepts LIKELY NOT covered in this topic.
                       - "LOCKED": If it requires advanced concepts (like Polymorphism/Database) definitely not covered here.

                    Strict JSON Output:
                    {
                        "projects": [
                            {
                                "rank": "E-RANK",
                                "title": "...",
                                "desc": "...",
                                "requiredSkills": ["Skill A"],
                                "status": "OPEN" 
                            },
                            {
                                "rank": "B-RANK",
                                "title": "...",
                                "desc": "...",
                                "requiredSkills": ["Skill A", "Skill B"],
                                "status": "WARNING"
                            },
                            {
                                "rank": "S-RANK",
                                "title": "...",
                                "desc": "...",
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
        res.status(500).json({ error: "Guild System Offline." });
    }
});

// =================================================================
// 3. GENERATE INTELLIGENT NOTES (ULTIMATE FIX) - Updated for Diagrams
// =================================================================
app.post('/generate-notes', async (req, res) => {
    try {
        const { videoUrl, topic } = req.body;
        console.log(">> NOTES REQUEST FOR:", videoUrl);

        let contextData = "";

        // STEP 1: Transcript Laane ki koshish karo
        if (videoUrl && videoUrl.includes('youtube')) {
            try {
                const transcriptItems = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
                contextData = transcriptItems.map(i => i.text).join(' ').substring(0, 15000);
                console.log(">> Transcript fetched.");
            } catch (e) {
                console.log(">> Transcript failed. Trying Metadata...");
            }
        }

        // STEP 2: Agar Transcript fail hua, to Video Title/Desc fetch karo (NoEmbed se)
        if (!contextData || contextData.length < 50) {
            try {
                const metaRes = await fetch(`https://noembed.com/embed?url=${videoUrl}`);
                const metaData = await metaRes.json();
                contextData = `Video Title: ${metaData.title}. \nVideo Author: ${metaData.author_name}. \n(Note: Captions were unavailable, generate notes based on this title and general knowledge about this topic).`;
                console.log(">> Metadata fetched as fallback.");
            } catch (err) {
                contextData = topic || "General Programming Concept"; // Bilkul hi fail hua to ye
            }
        }

        // STEP 3: AI Request
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are a helpful study assistant. Output strictly valid JSON." 
                },
                {
                    role: "user",
                    content: `
                    Create study notes based on this context: "${contextData}".
                    
                    **VISUALIZATION INSTRUCTION**:
                    In the "content" field of sections, if the concept is highly visual (e.g., Anatomy, Architecture diagrams, Flowcharts, Circuits), insert a tag  at the appropriate location.

                    Return strictly this JSON structure:
                    {
                        "title": "Topic Name",
                        "summary": "Brief summary...",
                        "sections": [
                            { "heading": "Key Concept", "content": "Explanation... 

[Image of concept diagram]
 additional details..." }
                        ],
                        "keyTakeaways": ["Point 1", "Point 2"]
                    }
                    `
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        // JSON Cleaning Logic
        let aiContent = completion.choices[0].message.content;
        aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiContent = jsonMatch[0];

        const data = JSON.parse(aiContent);
        res.json(data);

    } catch (error) {
        console.error("Notes Error:", error);
        res.json({
            title: "Data Unavailable",
            summary: "Could not access video data. This usually happens if the video has no captions/subtitles.",
            sections: [{ "heading": "System Message", "content": "Try using the 'Manual Transcript Mode' button to paste notes yourself." }],
            keyTakeaways: ["No Captions Found"]
        });
    }
});

// =================================================================
// 4. GENERATE ADVANCED ROADMAP (THE ORACLE)
// =================================================================
app.post('/generate-roadmap', async (req, res) => {
    try {
        const { role } = req.body; 
        console.log(">> PATHFINDER REQUEST:", role);

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are the Architect of the Hunter System. You create extremely detailed, project-based skill trees." },
                {
                    role: "user",
                    content: `
                    User wants to be a: "${role}".
                    Create a "Class Advancement Tree" from E-Rank (Noob) to S-Rank (Master).

                    For EACH Rank, provide:
                    1. "concepts": Very specific micro-skills (e.g., instead of 'JS', say 'ES6+, Promises, Async/Await').
                    2. "grind": 2-3 small practice exercises.
                    3. "boss_project": ONE major mandatory project to prove mastery.
                    4. "boss_desc": What specific features must the project have?

                    Strict JSON Output:
                    {
                        "roadmap": [
                            {
                                "rank": "E-RANK (Apprentice)",
                                "title": "The Awakening",
                                "concepts": ["Specific Skill A", "Specific Skill B"],
                                "grind": ["Small Task 1", "Small Task 2"],
                                "boss_project": "Name of Project",
                                "boss_desc": "Features required..."
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
        res.json(data);

    } catch (error) {
        console.error("Roadmap Error:", error);
        res.status(500).json({ error: "The Oracle is meditating." });
    }
});

// =================================================================
// 5. SHADOW TUTOR CHAT (PERSONA: IGRIS) - Updated for Diagrams
// =================================================================
app.post('/chat-with-shadow', async (req, res) => {
    try {
        const { message, context } = req.body;

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `
                    YOU ARE 'IGRIS', THE COMMANDER SHADOW.
                    Your mission is to train the Hunter (User) in "${context || 'General Knowledge'}".

                    🔥 TEACHING STRATEGY (FOLLOW STRICTLY):
                    1. **Confirm & Simplify:** Start with a very simple, non-technical explanation. Create a mental image (Analogy).
                    2. **Engineering Context:** Connect that analogy to the actual technical/coding concept.
                    3. **Concrete Example/Diagram:** Give a code snippet, math formula, OR a diagram to lock the concept.
                    4. **Recap:** End with a 1-line summary.

                    **IMAGE PROTOCOL**: 
                    If the concept involves architecture, flow, physical components, or systems, insert a diagram tag  within the "combat-example" div. Do not use images for generic people or abstract feelings.

                    RULES:
                    - Stay strictly relevant to the topic: "${context}".
                    - If the user asks irrelevancies (movies, gossip), strictly guide them back.
                    - Tone: Loyal, Knightly, Encouraging ("My Liege").

                    👇 RETURN THIS EXACT HTML STRUCTURE (No Markdown):
                    
                    <div class="report-card">
                        <div class="tactical-analysis">
                            <strong>🛡️ TACTICAL ANALYSIS:</strong>
                            [Simple definition here]. Think of it like this: [Insert Real Life Analogy].
                        </div>
                        
                        <div style="margin: 10px 0; padding-left: 10px; border-left: 2px solid #bd00ff; color: #ddd; font-size: 0.9rem;">
                            <em>"In the engineering realm, My Liege, this translates to [Technical Explanation]..."</em>
                        </div>

                        <div class="combat-example">
                            <strong>⚡ Examples:</strong><br>
                            [Insert Diagram Tag here if applicable, e.g. Image of CPU Architecture]
                            [Code Snippet / Formula]
                        </div>

                        <div class="final-blow">
                            <strong>🩸 FINAL BLOW:</strong> [One line summary]. 
                            <br><span style="font-size:0.8rem; opacity:0.7;">(Shall I provide a practice problem, My Liege?)</span>
                        </div>
                    </div>
                    ` 
                },
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6, 
        });

        const reply = completion.choices[0].message.content;
        res.json({ reply: reply });

    } catch (error) {
        console.error("Shadow Error:", error);
        res.status(500).json({ reply: "My Liege... The System is rebooting." });
    }
});

// =================================================================
// START SERVER
// =================================================================
app.listen(port, () => {
    console.log(`\n🚀 HUNTER SERVER ONLINE: http://localhost:${port}`);
    console.log(`👉 Shadow Chat Ready`);
    console.log(`👉 Guild Board Ready`);
    console.log(`👉 Dungeon Gate Ready`);
    console.log(`👉 Oracle Path Ready\n`);
});