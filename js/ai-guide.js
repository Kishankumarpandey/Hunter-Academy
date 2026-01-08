/**
 * AI SYSTEM INTERFACE (LOGIC CORE)
 * Generates structured prompts for the AI based on game context.
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
     * @param {string} skill - The current subject (e.g., "C Programming")
     * @param {number} level - Player's current level (1-5)
     * @param {string} userDoubt - The text typed by the user
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
     * Main function called by the UI.
     * Currently simulates the API call by logging to console.
     */
    async askSystem(skill, userDoubt, level) {
        if (!userDoubt) return;

        console.group("🔮 SYSTEM AI: PROCESSING REQUEST");
        console.log("Analyzing Input:", userDoubt);
        console.log("Calibrating for Level:", level);

        // Generate the prompt
        const payload = this.constructPrompt(skill, level, userDoubt);

        // LOG THE FINAL PROMPT (As requested)
        console.log("%c>>> FINAL PROMPT GENERATED <<<", "color: #00eaff; font-weight: bold;");
        console.log(payload);
        console.groupEnd();

        // Simulate network delay for realism
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(payload);
            }, 1000);
        });
    }
}

// Export instance
const systemAI = new SystemAI();