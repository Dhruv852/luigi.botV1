// Get API key from server
let API_KEY;
let ALLOWS_MULTIMODAL = false;

// Initialize conversation history
let conversationHistory = [];

// Fetch API key from server
fetch('/api/config')
    .then(response => response.json())
    .then(data => {
        API_KEY = data.apiKey;
        ALLOWS_MULTIMODAL = data.allowsMultimodal || false;
    })
    .catch(error => {
        console.error('Error fetching API key:', error);
    });

// API URLs for different models
const TEXT_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MULTIMODAL_API_URL = '/api/chat'; // Our backend endpoint

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const soundButton = document.getElementById('sound-button');
const soundIcon = soundButton.querySelector('.sound-icon');
const audio = new Audio('Mario-theme-song.mp3');
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageInput = document.getElementById('image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

// Variable to store the currently selected image file
let selectedImage = null;

// Initialize audio state
let isAudioLoaded = false;

// Audio toggle functionality
audio.addEventListener('canplaythrough', () => {
    isAudioLoaded = true;
});

soundButton.addEventListener('click', () => {
    if (!isAudioLoaded) return;
    
    if (audio.paused) {
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
        });
        soundIcon.textContent = '🔇';
    } else {
        audio.pause();
        soundIcon.textContent = '🔊';
    }
});

// Image upload functionality
imageUploadBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedImage = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(selectedImage);
    }
});

removeImageBtn.addEventListener('click', () => {
    selectedImage = null;
    imageInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
});

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Handle sending messages
async function sendMessage() {
    const message = userInput.value.trim();
    
    // Check if there's no message and no image
    if (!message && !selectedImage) return;
    
    // Create user message for display
    const displayMessage = message || (selectedImage ? "I'm sending you this image." : "");
    
    // Add user message to chat
    const userMessageElement = addMessage(displayMessage, 'user');
    
    // If there's an image, display it in the user message
    if (selectedImage) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            userMessageElement.appendChild(img);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        reader.readAsDataURL(selectedImage);
    }
    
    // Clear input fields
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show loading message
    const loadingMessage = addMessage('Thinking...', 'bot');
    
    try {
        let responseData;
        
        if (selectedImage) {
            // Use multimodal endpoint with FormData for image upload
            const formData = new FormData();
            formData.append('image', selectedImage);
            formData.append('text', message || "");
            formData.append('history', JSON.stringify(conversationHistory));
            
            const response = await fetch(MULTIMODAL_API_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }
            
            responseData = await response.json();
            
            // Reset image state
            selectedImage = null;
            imageInput.value = '';
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
        } else {
            // Text-only message - create message object
            const userMessage = {
                role: "user",
                parts: [{ text: message }]
            };
            
            // Add user message to conversation history
            conversationHistory.push(userMessage);
            
            // Use text-only API
            const response = await fetch(`${TEXT_API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: conversationHistory,
                    safetySettings: [{
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                        candidateCount: 1
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }
            
            responseData = await response.json();
        }
        
        if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
            // Remove loading message
            loadingMessage.remove();
            
            // Add bot response with Mario style
            const marioResponses = ['Mama mia! ', 'It\'s-a me, Luigi! ', 'Wahoo! ', 'Here we go! '];
            const randomResponse = marioResponses[Math.floor(Math.random() * marioResponses.length)];
            const botResponse = responseData.candidates[0].content.parts[0].text;
            const marioStyledResponse = randomResponse + botResponse;
            addMessage(marioStyledResponse, 'bot');
            
            // Add bot response to conversation history
            conversationHistory.push({
                role: "model",
                parts: [{ text: botResponse }]
            });
            
            // Limit conversation history to last 10 messages to prevent token limit issues
            if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
            }
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        console.error('Error:', error);
        loadingMessage.remove();
        addMessage(`Sorry, I encountered an error: ${error.message}. Please try again.`, 'bot');
    }
}

// Function to parse markdown-like syntax
function parseMarkdown(text) {
    // Replace code blocks first to prevent interference with other markdown
    const codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        codeBlocks.push(code);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Function to apply syntax highlighting
    function applySyntaxHighlighting(code) {
        return code
            .replace(/\b(function|return|const|let|var|if|else|for|while|do|switch|case|break|continue|try|catch|throw|new|typeof|instanceof|in|of|class|extends|super|import|export|default|null|undefined|true|false)\b/g, '<span class="keyword">$1</span>')
            .replace(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g, '<span class="function">$1</span>(')
            .replace(/\b([0-9]+(?:\.[0-9]+)?)\b/g, '<span class="number">$1</span>')
            .replace(/(\/\/[^\n]*|\/*[^*]*\*+([^\/][^*]*\*+)*\/)/g, '<span class="comment">$1</span>')
            .replace(/(["'`])(.*?)\1/g, '<span class="string">$1$2$1</span>')
            .replace(/\b([A-Z][A-Za-z0-9_$]*)\b(?!\()/g, '<span class="class-name">$1</span>')
            .replace(/\b(console|Math|Array|Object|String|Number|Boolean|RegExp|Date|JSON|Promise)\b/g, '<span class="builtin">$1</span>')
            .replace(/([+\-*/%=<>!&|^~?:]+)/g, '<span class="operator">$1</span>');
    }

    // Replace headings (# Heading)
    text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');

    // Replace numbered lists
    text = text.replace(/^(\d+)\. (.+)$/gm, '<div class="list-item"><span class="number">$1.</span> $2</div>');

    // Replace bullet points
    text = text.replace(/^\*\s+(.+)$/gm, '<div class="list-item bullet">$1</div>');

    // Replace **text** with <strong>text</strong> for bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Replace *text* with <em>text</em> for italics
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Replace single backtick code with <code> for inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Add paragraph breaks
    text = text.replace(/\n\n/g, '<br><br>');

    // Restore code blocks with proper formatting
    text = text.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        const code = codeBlocks[index];
        const firstLineEnd = code.indexOf('\n');
        let language = '';
        let codeContent = code;

        if (firstLineEnd !== -1) {
            language = code.slice(0, firstLineEnd).trim();
            codeContent = code.slice(firstLineEnd + 1);
        }

        // Apply syntax highlighting to the code content
        const highlightedCode = applySyntaxHighlighting(escapeHtml(codeContent.trim()));

        return `<div class="code-block-container">
            <div class="code-header">
                ${language ? `<span class="code-language">${language}</span>` : ''}
                <button class="copy-code-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code class="${language ? 'language-' + language : ''}">${highlightedCode}</code></pre>
        </div>`;
    });
    return text;
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to copy code to clipboard
function copyCode(button) {
    const codeBlock = button.closest('.code-block-container').querySelector('code');
    const textArea = document.createElement('textarea');
    textArea.value = codeBlock.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    button.textContent = 'Copied!';
    setTimeout(() => {
        button.textContent = 'Copy';
    }, 2000);
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.style.display = 'block'; // Ensure message is visible
    messageDiv.style.opacity = '1'; // Set full opacity
    
    if (text) {
        // Parse code blocks
        const parts = text.split(/(```[\s\S]*?```)/g);
        parts.forEach(part => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const codeContent = part.slice(3, -3);
                const firstLineEnd = codeContent.indexOf('\n');
                let language = '';
                let code = codeContent;

                // Extract language if specified
                if (firstLineEnd !== -1) {
                    language = codeContent.slice(0, firstLineEnd).trim();
                    code = codeContent.slice(firstLineEnd + 1);
                }

                const preElement = document.createElement('pre');
                const codeElement = document.createElement('code');
                
                // Preserve indentation and whitespace
                code = code.replace(/\t/g, '    '); // Convert tabs to spaces
                codeElement.textContent = code.trim();
                
                if (language) {
                    codeElement.classList.add(`language-${language}`);
                    preElement.classList.add(`language-${language}`);
                }
                
                // Add copy button
                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy';
                copyButton.className = 'copy-code-btn';
                copyButton.onclick = () => {
                    navigator.clipboard.writeText(code.trim());
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => copyButton.textContent = 'Copy', 2000);
                };
                
                preElement.appendChild(copyButton);
                preElement.appendChild(codeElement);
                messageDiv.appendChild(preElement);
                
                messageDiv.appendChild(codeElement);
            } else {
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = parseMarkdown(part);
                messageDiv.appendChild(contentDiv);
            }
        });
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }
});