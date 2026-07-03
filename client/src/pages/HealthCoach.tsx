import { useEffect, useState, useRef } from 'react';
import { Send, Bot, User, Lightbulb, AlertTriangle } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function HealthCoach() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getMessages().then(setMessages).catch(() => {});
    api.getHospitalQuestions().then(data => setQuestions(data.questions || [])).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);

    // 즉시 사용자 메시지 표시
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);

    try {
      const response = await api.sendMessage(userMsg);
      setMessages(prev => [...prev, response]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '죄송합니다. 응답을 생성하지 못했습니다. 다시 시도해주세요.', timestamp: new Date().toISOString() }]);
    }
    setSending(false);
  };

  const quickPrompts = [
    '내 검진 결과를 쉽게 설명해줘',
    '혈압과 콜레스테롤 수치가 걱정돼',
    '이번 주 운동 계획을 세워줘',
    '다음 진료 때 물어볼 질문 추천해줘',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI 건강 코치</h1>
        <p className="text-gray-500 mt-1">검진 결과 해석, 생활습관 조언, 진료 준비를 도와드립니다.</p>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col card p-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-primary-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">안녕하세요! MyHealth 건강 코치입니다.</h3>
                <p className="text-gray-500 mb-6">검진 결과에 대해 궁금한 점이나 건강 관리에 대해 물어보세요.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm hover:bg-primary-100 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  {msg.metadata?.limitations && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50 text-xs text-gray-500 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{msg.metadata.limitations[0]}</span>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="건강에 대해 물어보세요..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="btn-primary rounded-xl px-4 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel - Hospital Questions */}
        <div className="w-80 card overflow-y-auto hidden lg:block">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            병원 상담 질문
          </h3>
          <p className="text-xs text-gray-500 mb-4">다음 진료 시 의사에게 물어볼 질문 목록입니다.</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-gray-700">
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
