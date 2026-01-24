// Detect environment automatically
const isLocal = window.location.hostname === "localhost" 
             || window.location.hostname === "127.0.0.1";

export const API_BASE_URL = isLocal
    ? "http://localhost:3001"
    : "https://hunter-academy-1.onrender.com";
