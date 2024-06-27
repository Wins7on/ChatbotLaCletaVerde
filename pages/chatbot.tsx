import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

// Interface for chat messages
interface ChatMessage {
  type: 'question' | 'response'; 
  text: string; 
}

// Chat application logic
class ChatApp {
  description: string; 
  apiKey: string; 
  apiUrl: string; 

  constructor() {
    this.description = 'Je suis Hacky, ton chatbot pour apprendre le hacking éthique. Tu trouveras ici des techniques pour renforcer la sécurité informatique ';
    this.apiKey = 'AIzaSyBVHf9S6j4i_w47s8bl9PO5K39dQ6bg96U'; // Replace with your actual API key
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

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: "Hola" },
          ],
        },
        {
          role: "model",
          parts: [
            { text: "Salut, je suis Hacky. Qu'aimerais-tu apprendre aujourd'hui ?" },
          ],
        },
        { role: "user", parts: [{ text: this.escapeString(this.description) + " Current date: Date actuelle: " + formatDate(new Date().toLocaleDateString()) }] },
        ...conversationHistory.map(message => ({
          role: message.type === 'question' ? "user" : "model",
          parts: [{ text: this.escapeString(message.text) }]
        })),
        { role: "user", parts: [{ text: this.escapeString(inputText) }] },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      console.log('API response:', data);
      
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
  const [messages, setMessages] = useState<ChatMessage[]>([]); 
  const [inputValue, setInputValue] = useState<string>(''); 
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]); 
  const [chatApp, setChatApp] = useState<ChatApp | null>(null); 
  const [isMinimized, setIsMinimized] = useState<boolean>(false); 
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null); 
  const resizeHandleRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    const app = new ChatApp();
    app.fetchDescription().then(() => {
      setChatApp(app);
    });

    // Set the background video 
    const videoElement = document.createElement("video");
    videoElement.src = "/codevideo.mp4"; 
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.style.position = "fixed";
    videoElement.style.top = "0";
    videoElement.style.left = "0";
    videoElement.style.width = "100%";
    videoElement.style.height = "100%";
    videoElement.style.objectFit = "cover";
    videoElement.style.zIndex = "-1";
    document.body.appendChild(videoElement);

    document.body.style.position = "relative"; 

    const logoElement = document.createElement("img");
    logoElement.src = "/perroaltapi.png";
    logoElement.style.position = "absolute";
    logoElement.style.top = "20px";
    logoElement.style.left = "20px";
    logoElement.style.width = "100px"; 
    document.body.appendChild(logoElement);

    // Add the "Made by" label
    const madeByLabel = document.createElement("div");
    madeByLabel.textContent = "Made by Winston Bustillo";
    madeByLabel.style.position = "fixed";
    madeByLabel.style.bottom = "10px";
    madeByLabel.style.left = "10px";
    madeByLabel.style.fontSize = "14px";
    madeByLabel.style.color = "#FFFFFF";
    madeByLabel.style.fontStyle = "italic";
    madeByLabel.style.zIndex = "1000";
    document.body.appendChild(madeByLabel);
    
    return () => {
      document.body.removeChild(videoElement);
      document.body.removeChild(logoElement);
      document.body.removeChild(madeByLabel);
    };
  }, []);
  
  useEffect(() => {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (inputValue.trim() !== '') {
      const newUserMessage: ChatMessage = { type: 'question', text: inputValue };
      
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      setConversationHistory((prevHistory) => [...prevHistory, newUserMessage]);
      
      setInputValue('');
      
      if (chatApp) {
        setIsTyping(true);
        const responseText = await chatApp.sendMessage(inputValue, [...conversationHistory, newUserMessage]);
        const newBotMessage: ChatMessage = { type: 'response', text: responseText };
        
        setMessages((prevMessages) => [...prevMessages, newBotMessage]);
        setConversationHistory((prevHistory) => [...prevHistory, newBotMessage]);
        setIsTyping(false);
      }
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setInputValue(inputValue + '\n');
    }
  };
 
  const renderMarkdown = (text: string) => {
    const formattedText = text.replace(/(\n|^)(\* )/g, '$1\n$2');
    const html = marked(formattedText);
    return { __html: html };
  };
  
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
  
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div ref={containerRef} style={{ ...styles.container, ...(isMinimized ? styles.containerMinimized : {}) }}>
      <div ref={resizeHandleRef} style={styles.resizeHandle} onMouseDown={handleMouseDown}></div>
      <div style={styles.header}>
        <span>Ton Coach en Hacking Éthique</span>
        <button onClick={handleMinimize} style={styles.minimizeButton}>{isMinimized ? '🔍' : '➖'}</button>
      </div>
      {!isMinimized && (
        <>
          <div style={styles.messages} id="messages">
            {messages.map((msg, index) => (
              <div key={index} style={msg.type === 'question' ? styles.userBubble : styles.botBubble} dangerouslySetInnerHTML={renderMarkdown(msg.text)} />
            ))}
            <div ref={messagesEndRef} />
            {isTyping && <div style={styles.typingIndicator}>Je Tape...</div>}
          </div>
          <div style={styles.inputContainer}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Écrivez votre question ici"
              style={styles.input}
            />
            <button onClick={handleSendMessage} style={styles.button}>Hack</button>
          </div>
        </>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '475px',
    height: '647px',
    backgroundImage: `url(/perroaltapi.png)`,
    backgroundRepeat: 'no-repeat', 
    backgroundPosition: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 1.0)', 
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
    color: '#666609',
    backgroundColor: '#F6A3F1', // Magenta palê header
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
    color: '#A3E9F6', // Cyan palê typing indicator
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
    backgroundColor: '#A3E9F6', // Cyan button
    color: 'black',
    borderRadius: '0 4px 4px 0',
    cursor: 'pointer',
  },
  buttonHover: {
    backgroundColor: '#45a049', // Darker green on hover
  },
  userBubble: {
    backgroundColor: '#F6A3F1', // Magenta user bubble
    borderRadius: '10px',
    padding: '2px 5px',
    margin: '2px 0',
    alignSelf: 'flex-end',
    maxWidth: '80%',
    textAlign: 'right',
    color: '#206432',
  },
  botBubble: {
    backgroundColor: '#A3E9F6', // Cyan bot bubble
    borderRadius: '10px',
    padding: '2px 5px',
    margin: '2px 0',
    alignSelf: 'flex-start',
    maxWidth: '80%',
    color: '#206432',
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
  },
  madeByLabel: {
      position: 'absolute',
      bottom: '5px',
      left: '10px',
      fontSize: '12px',
      color: '#666609',
      fontStyle: 'italic',
  },
};

export default Chatbot;