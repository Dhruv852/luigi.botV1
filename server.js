const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
    process.exit(1);
}

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + fileExt);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// API endpoint to get the API key and config
app.get('/api/config', (req, res) => {
    res.json({ 
        apiKey: GEMINI_API_KEY,
        allowsMultimodal: true
    });
});

// API endpoint to process multimodal input
app.post('/api/chat', upload.single('image'), async (req, res) => {
    try {
        const { text, history } = req.body;
        const conversationHistory = JSON.parse(history || '[]');
        
        let requestBody = {
            contents: conversationHistory
        };
        
        // If there's an image file, add it to the latest user message
        if (req.file) {
            const imageData = fs.readFileSync(req.file.path);
            const base64Image = imageData.toString('base64');
            
            // Create a new user message with both text and image
            const userMessage = {
                role: "user",
                parts: [
                    { text: text || "What's in this image?" },
                    {
                        inline_data: {
                            mime_type: req.file.mimetype,
                            data: base64Image
                        }
                    }
                ]
            };
            
            // Add the user message to the conversation history
            requestBody.contents.push(userMessage);
        } else if (text) {
            // Text-only message
            const userMessage = {
                role: "user",
                parts: [{ text: text }]
            };
            requestBody.contents.push(userMessage);
        }
        
        // Set Gemini API configuration
        requestBody.safetySettings = [{
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
        }];
        
        requestBody.generationConfig = {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            candidateCount: 1
        };
        
        // Make request to Gemini API
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Clean up the uploaded file
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        
        // Return the Gemini API response
        res.json(response.data);
    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ 
            error: error.response?.data?.error || error.message || 'Unknown error',
            message: 'Failed to process chat request'
        });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const startServer = (port) => {
    return new Promise((resolve, reject) => {
        const server = app.listen(port)
            .once('listening', () => {
                console.log(`Server is running on port ${port}`);
                resolve(server);
            })
            .once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is busy, trying next port...`);
                    server.close();
                    resolve(startServer(port + 1));
                } else {
                    reject(err);
                }
            });
    });
};

const PORT = process.env.PORT || 3000;
startServer(PORT).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});