import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Key, Check, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  isActive: boolean;
}

interface APIKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ isOpen, onClose }) => {
  const { aiProviders, addAIProvider, removeAIProvider, selectedAIProvider, setSelectedAIProvider } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai' as 'openai' | 'gemini',
    apiKey: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newProvider = {
      id: Date.now().toString(),
      name: formData.name,
      provider: formData.provider,
      apiKey: formData.apiKey,
      isActive: true,
    };

    addAIProvider(newProvider);
    setFormData({ name: '', provider: 'openai', apiKey: '' });
    setShowForm(false);
  };

  const testAPIKey = async (providerId: string, apiKey: string, provider: string) => {
    setTestingKey(providerId);
    setTestResults(prev => ({ ...prev, [providerId]: null }));

    try {
      // Test the API key by making a simple request
      const testEndpoint = provider === 'openai' 
        ? 'https://api.openai.com/v1/models'
        : 'https://generativelanguage.googleapis.com/v1beta/models';

      const headers: Record<string, string> = provider === 'openai'
        ? { 'Authorization': `Bearer ${apiKey}` }
        : {};

      const url = provider === 'openai' 
        ? testEndpoint
        : `${testEndpoint}?key=${apiKey}`;

      const response = await fetch(url, { 
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        setTestResults(prev => ({ ...prev, [providerId]: 'success' }));
      } else {
        setTestResults(prev => ({ ...prev, [providerId]: 'error' }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [providerId]: 'error' }));
    } finally {
      setTestingKey(null);
    }
  };

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Key size={20} />
            <span>AI API Keys</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-500">
          <h3 className="text-blue-300 font-medium mb-2">Why add your own API keys?</h3>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• Unlimited AI requests (no daily quota)</li>
            <li>• Access to latest AI models</li>
            <li>• Better performance and reliability</li>
            <li>• Your keys are encrypted and stored locally</li>
          </ul>
        </div>

        {/* Existing API Keys */}
        <div className="space-y-4 mb-6">
          {aiProviders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Key size={48} className="mx-auto mb-4 opacity-50" />
              <p>No API keys configured</p>
              <p className="text-sm">Add your OpenAI or Google Gemini API key to get started</p>
            </div>
          ) : (
            aiProviders.map((provider) => (
              <div
                key={provider.id}
                className={`p-4 rounded-lg border ${
                  selectedAIProvider === provider.id
                    ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                    : 'border-gray-600 bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="selectedProvider"
                      checked={selectedAIProvider === provider.id}
                      onChange={() => setSelectedAIProvider(provider.id)}
                      className="text-blue-500"
                    />
                    <div>
                      <h3 className="text-white font-medium">{provider.name}</h3>
                      <p className="text-gray-400 text-sm capitalize">{provider.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {testResults[provider.id] === 'success' && (
                      <Check size={16} className="text-green-400" />
                    )}
                    {testResults[provider.id] === 'error' && (
                      <X size={16} className="text-red-400" />
                    )}
                    
                    <button
                      onClick={() => testAPIKey(provider.id, provider.apiKey, provider.provider)}
                      disabled={testingKey === provider.id}
                      className="text-blue-400 hover:text-blue-300 text-sm disabled:opacity-50"
                    >
                      {testingKey === provider.id ? 'Testing...' : 'Test'}
                    </button>
                    
                    <button
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      {showKeys[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    
                    <button
                      onClick={() => removeAIProvider(provider.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-300 font-mono">
                  {showKeys[provider.id] ? provider.apiKey : maskApiKey(provider.apiKey)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New API Key Form */}
        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-white font-medium">Add New API Key</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My OpenAI Key"
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value as 'openai' | 'gemini' }))}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={formData.provider === 'openai' ? 'sk-...' : 'AIza...'}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.provider === 'openai' 
                  ? 'Get your API key from: https://platform.openai.com/api-keys'
                  : 'Get your API key from: https://makersuite.google.com/app/apikey'
                }
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add API Key
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span>Add API Key</span>
          </button>
        )}

        {/* Shared Provider Info */}
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                name="selectedProvider"
                checked={selectedAIProvider === 'shared'}
                onChange={() => setSelectedAIProvider('shared')}
                className="text-blue-500"
              />
              <div>
                <h3 className="text-white font-medium">Shared AI (Free)</h3>
                <p className="text-gray-400 text-sm">Limited daily quota</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              100 requests/day
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};