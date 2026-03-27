import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

const API_URL = 'http://localhost:3001';
const SUGGESTIONS = [
  'What topics are covered in the MLOps course?',
  'How is the final grade determined?',
  'Explain hidden technical debt in ML systems',
  'What does the EU AI Act regulate?',
];

export default function App2() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const { content, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (content) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, content: last.content + content };
                return next;
              });
            }
          } catch (e) {
            if (e.message && !e.message.startsWith('Unexpected')) throw e;
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: `UH OH: ${err.message}` };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="h-dvh flex flex-col bg-[#FFFFFF] font-neoBody text-[#000000] selection:bg-[#FFE800]">
      <header className="shrink-0 border-b-4 border-black bg-white px-4 sm:px-6 py-3">
        <div className="max-w-[760px] mx-auto flex items-center justify-between gap-3">
          <h1 className="font-neoDisplay font-black text-lg sm:text-xl uppercase tracking-tight truncate min-w-0">
            MLOps Assistant Concepts
          </h1>
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setInput('');
            }}
            disabled={streaming || messages.length === 0}
            className="shrink-0 bg-white border-4 border-black px-3 py-2 sm:px-4 sm:py-2 font-neoDisplay font-black text-xs sm:text-sm brutal-shadow hover:brutal-shadow-hover active:brutal-shadow-active transition-transform disabled:opacity-50 disabled:pointer-events-none uppercase"
          >
            Clear text
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-[radial-gradient(#ccc_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="max-w-[760px] mx-auto">
          {empty ? (
            <div className="pt-6 pb-4 animate-fade-in">
              <div className="bg-[#00E5FF] border-4 border-black brutal-shadow p-6 mb-8 transform -rotate-1">
                <h2 className="font-neoDisplay text-4xl md:text-6xl font-black uppercase leading-none">
                  ASK<br/>SOMETHING<br/>SMART.
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUGGESTIONS.map((q, i) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className={`text-left p-4 border-4 border-black brutal-shadow hover:brutal-shadow-hover active:brutal-shadow-active transition-transform bg-white ${i % 2 === 0 ? 'hover:bg-[#FFE800]' : 'hover:bg-[#FF007F] hover:text-white'}`}
                  >
                    <span className="font-neoDisplay font-bold text-lg block mb-1 opacity-50">#0{i+1}</span>
                    <span className="font-bold leading-tight">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                  <div className={`max-w-[85%] border-4 border-black p-4 brutal-shadow ${
                    msg.role === 'user' 
                      ? 'bg-[#FFE800]' 
                      : 'bg-white'
                  }`}>
                    <div className="text-xs font-black uppercase border-b-2 border-black pb-1.5 mb-2.5 tracking-wider">
                      {msg.role === 'user' ? 'YOU' : 'SYSTEM'}
                    </div>
                    <div className={`text-base font-medium select-text cursor-text ${msg.role === 'user' ? 'text-lg whitespace-pre-wrap' : ''}`}>
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <div className="prose prose-h1:font-neoDisplay prose-h1:font-black prose-h1:uppercase prose-h2:font-neoDisplay prose-h2:font-bold prose-a:text-[#FF007F] prose-a:font-bold prose-code:bg-[#00E5FF] prose-code:border-2 prose-code:border-black prose-code:font-bold select-text">
                          {msg.content ? <ReactMarkdown>{msg.content}</ReactMarkdown> : <div className="w-6 h-6 bg-black animate-spin" />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </main>

      <div className="shrink-0 border-t-4 border-black bg-white px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="max-w-[760px] mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Type here… (Shift+Enter for new line)"
            disabled={streaming}
            rows={1}
            className="flex-1 min-h-[52px] max-h-[200px] overflow-y-auto resize-none bg-[#F0F0F0] border-4 border-black px-4 py-3 font-bold text-base outline-none focus:bg-white transition-colors brutal-shadow-sm focus:brutal-shadow placeholder:text-gray-400 placeholder:font-bold placeholder:uppercase"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 bg-[#00E5FF] border-4 border-black px-6 py-3 font-neoDisplay font-black text-xl brutal-shadow hover:brutal-shadow-hover active:brutal-shadow-active transition-transform disabled:opacity-50 disabled:pointer-events-none"
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}
