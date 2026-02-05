import React from 'react';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const StatusBar: React.FC = () => {
  const { activeFile, user, selectedAIProvider, aiProviders, cursorPosition } = useStore();

  const getLanguageDisplay = () => {
    if (!activeFile) return 'No file';
    return activeFile.language.charAt(0).toUpperCase() + activeFile.language.slice(1);
  };

  const getAIProviderDisplay = () => {
    if (selectedAIProvider === 'shared') {
      return `AI: ${user?.aiQuotaUsed || 0}/100 requests`;
    }
    const provider = aiProviders.find(p => p.id === selectedAIProvider);
    return provider ? `AI: ${provider.name}` : 'AI: Not configured';
  };

  return (
    <div className="h-6 bg-blue-600 text-white text-xs flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <CheckCircle size={12} />
          <span>Ready</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <span>{getLanguageDisplay()}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <span>UTF-8</span>
        </div>
        
        {activeFile?.isModified && (
          <div className="flex items-center space-x-1">
            <AlertCircle size={12} />
            <span>Unsaved changes</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Zap size={12} />
          <span>{getAIProviderDisplay()}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <span>Ln 1, Col 1</span>
        </div>
      </div>
    </div>
  );
};