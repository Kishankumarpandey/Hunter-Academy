require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Note: SDK mein direct listModels ka function simple nahi hai, 
    // isliye hum ek model ko 'get' karke error catch karenge ya
    // standard 'gemini-pro' try karenge.
    
    console.log("Checking API Connection...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log(">> SUCCESS! 'gemini-1.5-flash' is WORKING.");
    
  } catch (error) {
    console.log("\n>> ERROR DETECTED:");
    console.log(error.message);
    
    console.log("\n>> SUGGESTION: Try using 'gemini-pro' or 'gemini-1.0-pro'");
  }
}

listModels();