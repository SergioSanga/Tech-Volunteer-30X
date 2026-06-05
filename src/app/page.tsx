"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "¿Qué es 30X y quiénes lo fundaron?",
  "¿Qué herramientas usa el equipo?",
  "¿Qué se espera de mí esta primera semana?",
  "¿Cómo funciona una cohorte online?",
  "¿A quién le escribo si tengo un bloqueo técnico?",
];

const SUGGESTIONS_SEPARATOR = "---SUGGESTIONS---";

function parseSuggestions(text: string): { clean: string; suggestions: string[] } {
  const idx = text.lastIndexOf(SUGGESTIONS_SEPARATOR);
  if (idx === -1) return { clean: text, suggestions: [] };
  const clean = text.slice(0, idx).trimEnd();
  const json = text.slice(idx + SUGGESTIONS_SEPARATOR.length).trim();
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return { clean, suggestions: parsed.slice(0, 3) };
  } catch {}
  return { clean, suggestions: [] };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTED_QUESTIONS);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Error del servidor" }));
        throw new Error(body.error || "Error del servidor");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let firstChunk = true;

      while (!done) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { done = true; break; }

          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              if (firstChunk) {
                firstChunk = false;
                setLoading(false);
                setMessages((prev) => [...prev, { role: "assistant", content: parsed.text }]);
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content + parsed.text,
                  };
                  return updated;
                });
              }
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Parse suggestions from the final message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        const { clean, suggestions: newSuggestions } = parseSuggestions(last.content);
        if (newSuggestions.length > 0) setSuggestions(newSuggestions);
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, content: clean };
        return updated;
      });
    } catch (e: any) {
      const msg = e?.message || "Hubo un error de conexión. Intenta de nuevo.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">30X</span>
            <span className="logo-label">Onboarding</span>
          </div>
          <span className="header-badge">Agente interno</span>
        </div>
      </header>

      <main className="main">
        {isEmpty ? (
          <div className="welcome">
            <div className="welcome-icon">👋</div>
            <h1 className="welcome-title">Bienvenido a 30X</h1>
            <p className="welcome-sub">
              Soy tu agente de onboarding. Respondo preguntas sobre la
              organización basándome en los documentos internos. Pregúntame lo
              que necesites.
            </p>
            <div className="suggestions">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="suggestion-chip"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message message--${msg.role}`}>
                <div className="message-bubble">
                  <span className="message-sender">
                    {msg.role === "user" ? "Tú" : "Agente 30X"}
                  </span>
                  <div className="message-content">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : null}
                    {msg.role === "assistant" &&
                      i === messages.length - 1 &&
                      msg.content === "" && (
                        <span className="cursor" />
                      )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message message--assistant">
                <div className="message-bubble">
                  <span className="message-sender">Agente 30X</span>
                  <div className="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="footer">
        {!isEmpty && suggestions.length > 0 && (
          <div className="suggestions-bar">
            {suggestions.map((q) => (
              <button
                key={q}
                className="suggestion-pill"
                onClick={() => sendMessage(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="input-area">
          <textarea
            ref={inputRef}
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            aria-label="Enviar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="footer-note">
          Responde solo con información de los documentos internos de 30X
        </p>
      </footer>

    </div>
  );
}
