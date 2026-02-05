const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateGameData(topic) {
    console.log("🎨 Agent 3 (Designer): Creating new game for:", topic);

    try {
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
                                "term": "Short Term", 
                                "def": "Definition",
                                "visual_prompt": "Cyberpunk style illustration of [Term], glowing neon"
                            }
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

        return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
        console.error("❌ Designer Error:", error.message);
        throw new Error("Game Generation Failed");
    }
}

module.exports = { generateGameData };