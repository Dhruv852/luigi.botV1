// Load environment variables
require('dotenv').config();

// Export the API key
module.exports = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
};