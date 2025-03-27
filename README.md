# Luigi Multimodal BOT

A modern web-based chatbot powered by Google's Gemini AI API that can process both text and images.

## Features

- Clean and responsive user interface
- Real-time chat with Gemini AI
- Support for multi-line messages
- Image upload and analysis capabilities
- Mobile-friendly design
- Luigi-themed UI with fun responses

## Setup

1. Install the required dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000` to start using the chatbot

## Usage

1. Type your message in the input box or click the image upload button to select an image
2. When uploading an image, you can also include text to ask specific questions about the image
3. Press Enter or click the Send button to send your message/image
4. Wait for the AI to respond
5. Continue the conversation as needed

## Technologies Used

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Node.js, Express.js
- AI: Google Gemini Pro Vision API for multimodal capabilities
- File handling: Multer for image uploads
- HTTP requests: Axios for API communication

## Security Features

- Backend handling of API requests instead of exposing API key in frontend
- Image validation and size limits
- Automatic cleanup of uploaded files after processing
- Error handling for failed requests
