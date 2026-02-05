import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIChat: React.FC = () => {
  const { 
    selectedAIProvider, 
    setSelectedAIProvider, 
    aiProviders, 
    currentWorkspace,
    activeFile,
    user,
    isAuthenticated
  } = useStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI coding assistant. I can help you with code explanations, debugging, optimizations, and more. What would you like to work on?',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getSelectedProvider = () => {
    if (selectedAIProvider === 'shared') {
      return { id: 'shared', name: 'Shared (Free)', apiKey: null };
    }
    return aiProviders.find(p => p.id === selectedAIProvider) || null;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const provider = getSelectedProvider();
    if (!provider) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Please select an AI provider first.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Check if user is authenticated (only required for non-shared providers)
    const token = localStorage.getItem('accessToken');
    if (provider.id !== 'shared' && !token) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Please log in to use custom AI providers. You can authenticate using Google or GitHub from the login page.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('Sending message to AI:', {
        provider: provider.id,
        hasApiKey: !!provider.apiKey,
        hasToken: !!token
      });

      // Include file context if available
      let contextualMessage = messageToSend;
      if (activeFile) {
        const fileContext = `\n\nCurrent file: ${activeFile.path} (${activeFile.language})\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``;
        contextualMessage = messageToSend + fileContext;
      }

      const response = await apiService.sendChatMessage({
        message: contextualMessage,
        conversationId: conversationId || undefined,
        workspaceId: currentWorkspace?.id,
        provider: provider.id,
        apiKey: provider.apiKey || undefined,
      });

      // Handle different response formats
      let responseContent = '';
      if (typeof response === 'string') {
        responseContent = response;
      } else if (response.response) {
        responseContent = response.response;
      } else if (response.choices && response.choices[0]?.message?.content) {
        responseContent = response.choices[0].message.content;
      } else if (response.content) {
        responseContent = response.content;
      } else {
        responseContent = 'I received your message but couldn\'t generate a proper response. Please try again.';
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

    } catch (error: any) {
      console.error('AI chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${error.response?.data?.error || error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your AI coding assistant. How can I help you today?',
        timestamp: new Date(),
      }
    ]);
    setConversationId(null);
  };

  const selectedProvider = getSelectedProvider();

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bot className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          </div>
          <button
            onClick={clearConversation}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center justify-between">
          <select
            value={selectedAIProvider}
            onChange={(e) => setSelectedAIProvider(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 rounded text-sm flex-1 mr-2"
          >
            <option value="shared">Shared (Free)</option>
            {aiProviders.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          
          {selectedProvider?.apiKey && (
            <div className="flex items-center space-x-1 text-green-400">
              <Key size={12} />
              <span className="text-xs">Connected</span>
            </div>
          )}
        </div>

        {selectedAIProvider === 'shared' && (
          <div className="mt-2 text-xs text-gray-400">
            {user?.aiQuotaUsed || 0}/100 daily requests used
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot size={16} className="text-blue-400 mt-1 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User size={16} className="text-white mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-blue-400" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedProvider 
                ? "Ask about your code..." 
                : "Please select an AI provider or add your API key"
            }
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading || !selectedProvider}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !selectedProvider}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send size={16} />
          </button>
        </div>

        {!selectedProvider && (
          <div className="mt-2 text-xs text-yellow-400">
            Add your API key in settings to use AI features
          </div>
        )}
      </div>
    </div>
  );
};