/**
 * AI SYSTEM INTERFACE (LOGIC CORE)
 * Generates structured prompts and fetches Real AI responses.
 */

class SystemAI {
    constructor() {
        // The Persona: Cold, Gamified, High-Tech
        this.systemPersona = `You are 'The System', an advanced AI interface for a Hunter (student). 
Your tone is robotic but helpful. You explain technical concepts using gaming metaphors 
(e.g., Memory = Inventory, Bugs = Glitches, Functions = Spells).`;
    }

    /**
     * Constructs the final prompt to send to the AI.
     */
    constructPrompt(skill, level, userDoubt) {
        // 1. Determine Complexity based on Level
        let complexityInstruction = "";
        
        if (level <= 2) {
            complexityInstruction = "EXPLANATION STYLE: Beginner (Rank E). Use simple analogies and avoid heavy jargon.";
        } else if (level <= 4) {
            complexityInstruction = "EXPLANATION STYLE: Intermediate (Rank B). Be technical but concise.";
        } else {
            complexityInstruction = "EXPLANATION STYLE: Expert (Rank S). Deep technical dive, focus on architecture and optimization.";
        }

        // 2. Build the Structured Prompt
        const finalPrompt = `
--- SYSTEM INSTRUCTION BLOCK ---
${this.systemPersona}

[PLAYER CONTEXT]
Current Class: Electronics Hunter
Active Skill: ${skill}
Current Level: ${level}

[USER QUERY]
"${userDoubt}"

[DIRECTIVE]
${complexityInstruction}
Answer the user's query acting as The System.
Limit response to 3-4 sentences.
--------------------------------
`;
        return finalPrompt;
    }

    /**
     * 🔥 UPDATED: Connects to Backend Server
     */
    async askSystem(skill, userDoubt, level) {
        if (!userDoubt) return;

        // 1. Generate the optimized prompt
        const promptPayload = this.constructPrompt(skill, level, userDoubt);

        console.log("📡 CONNECTING TO SERVER...");

        try {
            // 2. Send to Node.js Server (Ensure server.js is running on port 3001)
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: promptPayload }) 
            });

            if (!response.ok) throw new Error("Server Unreachable");

            const data = await response.json();
            return data.reply; // ✅ Returns Real AI Text

        } catch (error) {
            console.error("❌ SYSTEM OFFLINE:", error);
            return "⚠️ SYSTEM ERROR: Connection to Server Lost. Please restart the backend.";
        }
    }
}

// Export instance
const systemAI = new SystemAI();