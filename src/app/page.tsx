"use client";

import { useState, useRef, useEffect } from "react";

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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
    } catch (e: any) {
      const msg = e?.message || "Hubo un error de conexión. Intenta de nuevo.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `⚠️ ${msg}`,
        };
        return updated;
      });
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
                  <p className="message-content">
                    {msg.content}
                    {msg.role === "assistant" &&
                      i === messages.length - 1 &&
                      msg.content === "" && (
                        <span className="cursor" />
                      )}
                  </p>
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

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0a;
          --surface: #141414;
          --surface2: #1e1e1e;
          --border: #2a2a2a;
          --accent: #f0f0f0;
          --accent-dim: #888;
          --user-bg: #1a1a2e;
          --user-border: #2d2d50;
          --agent-bg: #141414;
          --text: #e8e8e8;
          --text-dim: #666;
          --radius: 12px;
          --font: 'DM Sans', system-ui, sans-serif;
        }

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

        html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          height: 56px;
          flex-shrink: 0;
          background: var(--bg);
        }
        .header-inner {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-mark { font-weight: 600; font-size: 18px; letter-spacing: -0.5px; color: #fff; }
        .logo-label { font-size: 13px; color: var(--text-dim); font-weight: 400; }
        .header-badge {
          font-size: 11px; color: var(--text-dim);
          border: 1px solid var(--border); padding: 3px 10px;
          border-radius: 20px; letter-spacing: 0.3px;
        }

        .main { flex: 1; overflow-y: auto; padding: 0 24px; }
        .main::-webkit-scrollbar { width: 4px; }
        .main::-webkit-scrollbar-track { background: transparent; }
        .main::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .welcome {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center;
          min-height: calc(100vh - 56px - 100px);
          text-align: center; padding: 40px 0;
        }
        .welcome-icon { font-size: 40px; margin-bottom: 20px; }
        .welcome-title { font-size: 26px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 12px; color: #fff; }
        .welcome-sub { font-size: 15px; color: var(--text-dim); max-width: 440px; line-height: 1.6; margin-bottom: 32px; }
        .suggestions { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 480px; }
        .suggestion-chip {
          background: var(--surface); border: 1px solid var(--border);
          color: var(--accent-dim); padding: 10px 16px;
          border-radius: var(--radius); font-size: 14px;
          cursor: pointer; text-align: left;
          transition: all 0.15s; font-family: var(--font);
        }
        .suggestion-chip:hover { border-color: #444; color: var(--text); background: var(--surface2); }

        .messages { padding: 24px 0; display: flex; flex-direction: column; gap: 16px; }

        .message { display: flex; }
        .message--user { justify-content: flex-end; }
        .message--assistant { justify-content: flex-start; }

        .message-bubble { max-width: 72%; display: flex; flex-direction: column; gap: 4px; }
        .message--user .message-bubble { align-items: flex-end; }

        .message-sender {
          font-size: 11px; color: var(--text-dim);
          font-weight: 500; letter-spacing: 0.3px; text-transform: uppercase;
        }

        .message-content {
          padding: 12px 16px; border-radius: var(--radius);
          font-size: 14px; line-height: 1.65;
          white-space: pre-wrap; word-break: break-word;
        }
        .message--user .message-content {
          background: var(--user-bg); border: 1px solid var(--user-border);
          color: #c8c8e8; border-bottom-right-radius: 4px;
        }
        .message--assistant .message-content {
          background: var(--surface); border: 1px solid var(--border);
          color: var(--text); border-bottom-left-radius: 4px;
          min-height: 44px;
        }

        /* Blinking cursor while streaming */
        .cursor {
          display: inline-block; width: 2px; height: 14px;
          background: var(--text-dim); margin-left: 2px;
          vertical-align: middle;
          animation: blink 0.8s step-end infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        .typing {
          display: flex; gap: 4px; padding: 12px 16px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); border-bottom-left-radius: 4px; width: fit-content;
        }
        .typing span {
          width: 6px; height: 6px; background: var(--text-dim);
          border-radius: 50%; animation: bounce 1.2s infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

        .footer {
          border-top: 1px solid var(--border);
          padding: 16px 24px 20px; background: var(--bg); flex-shrink: 0;
        }
        .input-area { display: flex; gap: 10px; align-items: flex-end; }
        .input {
          flex: 1; background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); color: var(--text);
          font-family: var(--font); font-size: 14px;
          padding: 12px 16px; resize: none; outline: none;
          line-height: 1.5; max-height: 120px; transition: border-color 0.15s;
        }
        .input:focus { border-color: #444; }
        .input::placeholder { color: var(--text-dim); }
        .input:disabled { opacity: 0.5; }

        .send-btn {
          background: #fff; border: none; border-radius: 10px;
          color: #000; width: 42px; height: 42px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: all 0.15s;
        }
        .send-btn:hover:not(:disabled) { background: #e0e0e0; }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .footer-note {
          font-size: 11px; color: var(--text-dim);
          text-align: center; margin-top: 10px; letter-spacing: 0.2px;
        }
      `}</style>
    </div>
  );
}
