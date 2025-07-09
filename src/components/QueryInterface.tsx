import React, { useState, useRef, useEffect } from 'react';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  mapObject?: any;
}

interface MapLocation {
  lat: number;
  lng: number;
  name?: string;
  zoom?: number;
  analysis?: any;
}

interface QueryInterfaceProps {
  onQuery?: (query: string) => void;
  isLoading?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
  onMapObject?: (mapObject: MapLocation) => void;
}

const QueryInterface: React.FC<QueryInterfaceProps> = ({ onQuery, isLoading, selectedLocation, onMapObject }) => {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    setError(null);
    const userMsg: Message = { sender: 'user', text: input };
    setChat(prev => [...prev, userMsg]);
    setLoading(true);
    setInput('');
    
    try {
      const payload = {
        input: input.trim(),
        location: selectedLocation || null
      };
      
      const response = await fetch('http://localhost:8000/api/agent', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to process request');
      }
      
      const data = await response.json();
      
      // Handle successful response
      if (data.status === 'success') {
        const agentMsg: Message = { 
          sender: 'agent', 
          text: data.text,
          ...(data.analysis && { analysis: data.analysis }),
          ...(data.map_data && { mapObject: data.map_data })
        };
        
        setChat(prev => [...prev, agentMsg]);
        
        // Update map if map data is available
        if (data.map_data?.center) {
          const { lat, lng } = data.map_data.center;
          const zoom = data.map_data.zoom || 12;
          const name = data.location?.name || 'Analyzed Location';
          
          if (onMapObject) {
            onMapObject({
              lat,
              lng,
              name,
              zoom,
              analysis: data.analysis || {}
            });
          }
          
          // Also update the selected location in the parent component if needed
          if (onQuery) {
            onQuery(JSON.stringify({
              type: 'location_update',
              location: { lat, lng, name },
              analysis: data.analysis
            }));
          }
        }
      } else {
        throw new Error(data.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Agent request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      setChat(prev => [
        ...prev, 
        { 
          sender: 'agent', 
          text: 'I encountered an error processing your request. ' + 
                'Please try rephrasing your question or try again later.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96 p-2">
      <div className="flex-1 overflow-y-auto bg-white rounded p-2 mb-2 border">
        {chat.length === 0 && <div className="text-gray-400 text-base">Ask a geospatial question...</div>}
        {chat.map((msg, idx) => (
          <div key={idx} className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`px-4 py-2 rounded-2xl max-w-[80%] text-base font-medium shadow-md ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white self-end'
                  : 'bg-gray-100 text-gray-900 self-start border border-gray-200'
              }`}
              style={{ wordBreak: 'break-word', lineHeight: 1.5 }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-3 flex justify-start">
            <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-500 text-base font-medium shadow-md border border-gray-200 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block"></span>
              <span>Agent is typing...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {error && (
        <div className="text-red-600 text-sm mb-2">{error}</div>
      )}
      <div className="flex gap-2 mt-auto">
        <input
          className="flex-1 border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={loading || isLoading}
          placeholder="Type your question..."
        />
        <button
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-base font-semibold disabled:opacity-50"
          onClick={handleSend}
          disabled={loading || isLoading || !input.trim()}
        >
          {loading || isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
};

export default QueryInterface;