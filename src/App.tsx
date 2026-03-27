import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Activity, 
  Calculator, 
  ShieldAlert, 
  BookOpen, 
  Mic, 
  MicOff, 
  History, 
  Settings,
  AlertCircle,
  ChevronRight,
  Clock,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clinicalAssistant } from './services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query;
    setQuery('');
    const newMessage: Message = { role: 'user', text: userQuery, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Audit log
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, timestamp: new Date(), type: 'clinical_query' })
      });

      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await clinicalAssistant.query(userQuery, history);
      const modelResponse: Message = { 
        role: 'model', 
        text: response.text || "Desculpe, não consegui processar essa solicitação.", 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, modelResponse]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "Erro crítico na conexão. Verifique os protocolos de rede.", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;

    if (!isListening) {
      recognition.start();
      setIsListening(true);
    } else {
      recognition.stop();
      setIsListening(false);
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      'Guidelines': 'Quais são os protocolos mais recentes para ',
      'Calculadoras': 'Calcule o score ',
      'Interações': 'Verifique interações medicamentosas entre ',
      'Diferenciais': 'Quais os diagnósticos diferenciais para um paciente com ',
    };
    setQuery(prompts[action] || '');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-medical-primary rounded-xl flex items-center justify-center shadow-lg shadow-medical-primary/20">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">MedPulse AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Clinical Decision Support</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
          >
            <History size={20} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400">
            <Settings size={20} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            System Ready
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 gap-6 overflow-hidden">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction 
            icon={<BookOpen size={18}/>} 
            label="Guidelines" 
            color="blue" 
            onClick={() => handleQuickAction('Guidelines')}
          />
          <QuickAction 
            icon={<Calculator size={18}/>} 
            label="Calculadoras" 
            color="purple" 
            onClick={() => handleQuickAction('Calculadoras')}
          />
          <QuickAction 
            icon={<ShieldAlert size={18}/>} 
            label="Interações" 
            color="orange" 
            onClick={() => handleQuickAction('Interações')}
          />
          <QuickAction 
            icon={<AlertCircle size={18}/>} 
            label="Diferenciais" 
            color="rose" 
            onClick={() => handleQuickAction('Diferenciais')}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden relative">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Activity size={48} className="text-medical-primary" />
                <div>
                  <h2 className="text-xl font-medium">Como posso ajudar hoje?</h2>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">
                    Consulte protocolos, realize cálculos ou analise casos clínicos em tempo real.
                  </p>
                </div>
              </div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user' 
                      ? 'bg-medical-primary text-white' 
                      : 'bg-white/5 border border-white/10 text-slate-200'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.text}
                    </div>
                    <div className={`text-[10px] mt-2 opacity-50 flex items-center gap-1 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <Clock size={10} />
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-medical-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-medical-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-medical-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Consultando bases médicas...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <form 
              onSubmit={handleSearch}
              className="relative flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Digite sua dúvida clínica ou comando..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-medical-primary/50 transition-all text-sm"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
              
              <button
                type="button"
                onClick={toggleSpeech}
                className={`p-3 rounded-xl transition-all ${
                  isListening 
                    ? 'bg-medical-danger text-white animate-pulse' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="bg-medical-primary hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-medical-primary text-white p-3 rounded-xl transition-all shadow-lg shadow-medical-primary/20"
              >
                <ChevronRight size={20} />
              </button>
            </form>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Zap size={10} /> RAG Enabled</span>
                <span className="flex items-center gap-1"><ShieldAlert size={10} /> PII Filter Active</span>
              </div>
              <span>Pressione Enter para enviar</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="py-3 px-6 text-center text-[10px] text-slate-500 border-t border-white/5">
        AVISO: MedPulse AI é uma ferramenta de suporte à decisão clínica. Não substitui o julgamento profissional do médico.
      </footer>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    rose: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  };

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${colors[color]}`}
    >
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );
}
