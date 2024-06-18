import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

// Interface for chat messages
interface ChatMessage {
  type: 'question' | 'response'; // Message type: user question or chatbot response
  text: string; // Message content
}

// Chat application logic
class ChatApp {
  description: string; // Description of the chatbot's purpose
  apiKey: string; // API key for accessing the language model
  apiUrl: string; // API endpoint URL

  constructor() {
    this.description = '';
    this.apiKey = ''; // Replace with your actual API key
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';
  }

  // Fetch the chatbot's description from a text file
  async fetchDescription(): Promise<void> {
    try {
      const response = await fetch('/description.txt');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      this.description = text;
      console.log('Description loaded:', this.description);
    } catch (err) {
      console.error('Failed to load description:', err);
    }
  }

  // Escape special characters in a string
  escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/'/g, "\\'")
              .replace(/\n/g, '')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
  }

  // Send a message to the language model and receive a response
  async sendMessage(inputText: string, conversationHistory: ChatMessage[]): Promise<string> {
    // Format the date in French
    function formatDate(dateString: string): string {
      const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ];
      const [year, month, day] = dateString.split('-');
      const dayNumber = parseInt(day, 10);
      const monthName = months[parseInt(month, 10) - 1];
      return `${dayNumber} ${monthName} ${year}`;
    }

    // Prepare the request body for the API call
    const requestBody = {
      contents: [
        // Initial greeting messages
        {
          role: "user",
          parts: [
            { text: "Salut" },
          ],
        },
        {
          role: "model",
          parts: [
            { text: "Salut je suis Carlos reponsable de la sécurité chez La Cleta Verde." },
          ],
        },
        // Include the chatbot's description and current date
        { role: "user", parts: [{ text: this.escapeString(this.description) + " Current date: Date actuelle: " + formatDate(new Date().toLocaleDateString()) }] },
        // Include the conversation history
        ...conversationHistory.map(message => ({
          role: message.type === 'question' ? "user" : "model",
          parts: [{ text: this.escapeString(message.text) }]
        })),
        // Include the user's input text
        { role: "user", parts: [{ text: this.escapeString(inputText) }] },
      ],
      // Configuration for text generation
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
      // Safety settings (not used in this example)
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    try {
      // Make the API call
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // Parse the response JSON
      const data = await response.json();
      console.log('API response:', data);

      // Extract and return the generated response text
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid API response structure');
      }
      return data.candidates[0].content.parts.map((part: any) => part.text).join(' ');

    } catch (error) {
      console.error('Error:', error);
      return 'Error fetching response';
    }
  }
}

// Chatbot component
const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Array of chat messages
  const [inputValue, setInputValue] = useState<string>(''); // Current input text
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]); // History of conversation
  const [chatApp, setChatApp] = useState<ChatApp | null>(null); // Instance of ChatApp
  const [isMinimized, setIsMinimized] = useState<boolean>(false); // Whether the chatbot is minimized
  const [isTyping, setIsTyping] = useState<boolean>(false); // Whether the chatbot is typing
  const messagesEndRef = useRef<HTMLDivElement>(null); // Reference to the end of the messages container
  const containerRef = useRef<HTMLDivElement>(null); // Reference to the chatbot container
  const resizeHandleRef = useRef<HTMLDivElement>(null); // Reference to the resize handle

  // Initialize the chatbot and set background image
  useEffect(() => {
    const app = new ChatApp();
    app.fetchDescription().then(() => {
      setChatApp(app);
    });

    // Set the background video
    const videoElement = document.createElement('video');
    videoElement.src = '/carlostyping.mp4';
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playbackRate = 0.5;
    videoElement.style.position = 'fixed';
    videoElement.style.top = '0';
    videoElement.style.left = '0';
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'contain';
    videoElement.style.zIndex = '-1';
    videoElement.style.backgroundColor = '#002000'; // Dark green color

    document.body.appendChild(videoElement);

    document.body.style.height = '100vh';
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'Arial, sans-serif';

    // Clean up styles and remove video on component unmount
    return () => {
      document.body.style.height = '';
      document.body.style.margin = '';
      document.body.style.fontFamily = '';
      document.body.removeChild(videoElement);
    };
  }, []);

  // Scroll to the bottom of the messages container when new messages are added
  useEffect(() => {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (inputValue.trim() !== '') {
      // Create a new user message object
      const newUserMessage: ChatMessage = { type: 'question', text: inputValue };

      // Update the messages and conversation history state
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      setConversationHistory((prevHistory) => [...prevHistory, newUserMessage]);

      // Clear the input field
      setInputValue('');

      // Send the message to the language model and get the response
      if (chatApp) {
        setIsTyping(true);
        const responseText = await chatApp.sendMessage(inputValue, [...conversationHistory, newUserMessage]);
        const newBotMessage: ChatMessage = { type: 'response', text: responseText };

        // Add the bot's response to the messages and conversation history
        setMessages((prevMessages) => [...prevMessages, newBotMessage]);
        setConversationHistory((prevHistory) => [...prevHistory, newBotMessage]);
        setIsTyping(false);
      }
    }
  };

  // Handle key presses in the input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Send message on Enter key press
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Add a new line on Shift+Enter
      e.preventDefault();
      setInputValue(inputValue + '\n');
    }
  };

  // Render text as Markdown
  const renderMarkdown = (text: string) => {
    const formattedText = text.replace(/(\n|^)(\* )/g, '$1\n$2');
    const html = marked(formattedText);
    return { __html: html };
  };

  // Handle resizing the chatbot container
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    const resizeHandle = resizeHandleRef.current;
    if (container && resizeHandle && e.target === resizeHandle) {
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = container.offsetWidth;
      const startHeight = container.offsetHeight;

      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = startWidth + (startX - e.clientX);
        const newHeight = startHeight + (startY - e.clientY);
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Handle minimizing/maximizing the chatbot
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    // Chatbot container
    <div ref={containerRef} style={{ ...styles.container, ...(isMinimized ? styles.containerMinimized : {}) }}>
      {/* Resize handle */}
      <div ref={resizeHandleRef} style={styles.resizeHandle} onMouseDown={handleMouseDown}></div>
      {/* Chatbot header */}
      <div style={styles.header}>
        <span>Assistant de La Cleta Verde</span>
        {/* Minimize/maximize button */}
        <button onClick={handleMinimize} style={styles.minimizeButton}>{isMinimized ? '🔍' : '➖'}</button>
      </div>
      {/* Chatbot content (hidden when minimized) */}
      {!isMinimized && (
        <>
          {/* Messages container */}
          <div style={styles.messages} id="messages">
            {/* Render each chat message */}
            {messages.map((msg, index) => (
              <div key={index} style={msg.type === 'question' ? styles.userBubble : styles.botBubble} dangerouslySetInnerHTML={renderMarkdown(msg.text)} />
            ))}
            {/* Placeholder for scrolling to the bottom */}
            <div ref={messagesEndRef} />
            {/* Typing indicator */}
            {isTyping && <div style={styles.typingIndicator}>L'assistant est en train d'écrire...</div>}
          </div>
          {/* Input field and send button */}
          <div style={styles.inputContainer}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Entrez votre message ici"
              style={styles.input}
            />
            <button onClick={handleSendMessage} style={styles.button}>Envoyer</button>
          </div>
        </>
      )}
    </div>
  );
};

// Styles for the chatbot component
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '475px',
    height: '647px',
    backgroundImage: `url(/lacletaverde.png)`, // Assuming the logo is in the public directory
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    backgroundColor: 'rgba(255, 255, 255, 1.0)', // White background with 80% opacity
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    padding: '10px',
    zIndex: 1000,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  containerMinimized: {
    width: '200px',
    height: '40px',
    overflow: 'hidden',
  },
  header: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '10px',
    color: '#FFFFFF',
    backgroundColor: '#008000', // Green header
    padding: '10px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimizeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '20px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  typingIndicator: {
    color: '#666',
    fontStyle: 'italic',
    margin: '10px 0',
    textAlign: 'center',
  },
  inputContainer: {
    display: 'flex',
    marginTop: 'auto',
  },
  input: {
    flex: 1,
    padding: '5px',
    border: '1px solid #ccc',
    borderRadius: '4px 0 0 4px',
  },
  button: {
    padding: '5px 10px',
    border: 'none',
    backgroundColor: '#4CAF50', // Green button
    color: 'white',
    borderRadius: '0 4px 4px 0',
    cursor: 'pointer',
  },
  buttonHover: {
    backgroundColor: '#45a049', // Darker green on hover
  },
  userBubble: {
    backgroundColor: '#174a1a', // Light green user bubble
    borderRadius: '10px',
    padding: '2px 5px',
    margin: '2px 0',
    alignSelf: 'flex-end',
    maxWidth: '80%',
    textAlign: 'right',
    color: '#ffffff',
  },
  botBubble: {
    backgroundColor: '#3d3d3d', // Light gray bot bubble
    borderRadius: '10px',
    padding: '2px 5px',
    margin: '2px 0',
    alignSelf: 'flex-start',
    maxWidth: '80%',
    color: '#ffffff',
  },
  resizeHandle: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '10px',
    height: '10px',
    backgroundColor: '#FFFFFF',
    cursor: 'nwse-resize',
    zIndex: 1001,
    borderTopLeftRadius: '8px',
  }
};

export default Chatbot;
