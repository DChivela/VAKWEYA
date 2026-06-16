import { Bot, HelpCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { askAssistant, getAssistantSuggestions } from '../services/api';

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Olá! Sou o assistente Vakwetu Weya. Posso ajudar com reservas, conta, hotéis, restaurantes, tours, mapa e histórico.'
};

export function VirtualAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getAssistantSuggestions().then((payload) => {
      if (!cancelled) {
        setSuggestions(payload.suggestions || []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  async function sendMessage(text) {
    const message = String(text || input).trim();

    if (!message || isSending) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message
    };

    setInput('');
    setIsSending(true);
    setMessages((current) => [...current, userMessage]);

    try {
      const payload = await askAssistant(message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: payload.answer,
          matched: payload.matched
        }
      ]);

      if (payload.suggestions?.length) {
        setSuggestions(payload.suggestions);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error.message || 'Não consegui responder agora. Tenta novamente dentro de instantes.'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className={isOpen ? 'assistant assistant--open' : 'assistant'}>
      {isOpen && (
        <section className="assistant-panel" aria-label="Assistente virtual Vakwetu Weya">
          <div className="assistant-panel__header">
            <div>
              <span>
                <Sparkles size={15} />
                FAQ inteligente
              </span>
              <strong>Weya Assistente</strong>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar assistente">
              <X size={18} />
            </button>
          </div>

          <div className="assistant-messages" ref={listRef}>
            {messages.map((message) => (
              <article
                className={
                  message.role === 'user'
                    ? 'assistant-message assistant-message--user'
                    : 'assistant-message'
                }
                key={message.id}
              >
                {message.role === 'assistant' && <Bot size={16} />}
                <p>{message.text}</p>
              </article>
            ))}
            {isSending && (
              <article className="assistant-message">
                <Bot size={16} />
                <p>A procurar a melhor resposta...</p>
              </article>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="assistant-suggestions" aria-label="Perguntas frequentes">
              {suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion.id || suggestion.question}
                  type="button"
                  onClick={() => sendMessage(suggestion.question)}
                  disabled={isSending}
                >
                  <HelpCircle size={14} />
                  {suggestion.question}
                </button>
              ))}
            </div>
          )}

          <form className="assistant-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escreve a tua dúvida..."
              maxLength="700"
              aria-label="Pergunta para o assistente"
            />
            <button type="submit" disabled={isSending || !input.trim()} aria-label="Enviar pergunta">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        className="assistant-toggle"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? 'Fechar assistente virtual' : 'Abrir assistente virtual'}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
