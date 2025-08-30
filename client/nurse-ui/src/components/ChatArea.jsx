import { useState, useRef, useEffect } from "react";
import { FiSend, FiUser, FiCpu } from "react-icons/fi";
import React from "react";
import { useAuthService } from "../authService";
import ReactMarkdown from "react-markdown";
import TextareaAutosize from "react-textarea-autosize";
import remarkGfm from "remark-gfm";

const medicalQuotes = [
  {
    quote: "Wherever the art of medicine is loved, there is also a love of humanity.",
    author: "Hippocrates"
  },
  {
    quote: "The good physician treats the disease; the great physician treats the patient who has the disease.",
    author: "William Osler"
  },
  {
    quote: "Medicine is a science of uncertainty and an art of probability.",
    author: "William Osler"
  },
  {
    quote: "To study the phenomena of disease without books is to sail an uncharted sea, while to study books without patients is not to go to sea at all.",
    author: "William Osler"
  },
  {
    quote: "Wherever the art of Medicine is loved, there is also a love of humanity.",
    author: "Hippocrates"
  },
  {
    quote: "Let the young know they will never find a more interesting, more instructive book than the patient himself.",
    author: "Giorgio Baglivi"
  }
];

export default function ChatArea({ conversationId, initialMessages }) {
  const [conversations, setConversations] = useState({});
  const { getToken } = useAuthService();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [quote] = useState(() => {
    const idx = Math.floor(Math.random() * medicalQuotes.length);
    return medicalQuotes[idx];
  });

  useEffect(() => {
    setConversations((prev) => ({
      ...prev,
      [conversationId]:
        initialMessages && initialMessages.length > 0
          ? initialMessages
          : [{ sender: "bot", text: "Hello! How can I help with your medical studies today?" }]
    }));
  }, [conversationId, initialMessages]);

  const messages = conversations[conversationId] || [];
  const chatStarted = messages.some((msg) => msg.sender === "user");

  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatStarted]);

  const updateMessages = (updater) => {
    setConversations((prev) => {
      const current = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: updater(current)
      };
    });
  };

  const addMessage = (sender, text) => {
    updateMessages((msgs) => [...msgs, { sender, text }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    addMessage("user", input);
    setLoading(true);

    const token = await getToken();
    const url = new URL("http://localhost:4000/api/chat/stream");
    url.searchParams.append("question", input);
    url.searchParams.append("conversationId", conversationId);
    url.searchParams.append("token", token);

    const eventSource = new EventSource(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let botBuffer = "";

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.done) {
          eventSource.close();
          setLoading(false);
          updateMessages((msgs) => {
            const last = msgs[msgs.length - 1];
            return [...msgs.slice(0, -1), { ...last, streaming: false }];
          });
          return;
        }
        if (parsed.delta) {
          updateMessages((msgs) => {
            const last = msgs[msgs.length - 1];
            if (last?.sender === "bot") {
              return [...msgs.slice(0, -1), { ...last, text: last.text + parsed.delta, streaming: true }];
            } else {
              return [...msgs, { sender: "bot", text: parsed.delta, streaming: true }];
            }
          });
        }
      } catch (err) {
        console.error("❌ Failed to parse stream chunk", e.data, err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
      addMessage("bot", "Sorry, an error occurred.");
    };

    addMessage("bot", "");
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Enhanced Input Area styling (modern UI)
  const inputArea = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="w-full max-w-2xl mx-auto px-4 py-3 border-t-0 bg-white/80 rounded-2xl shadow-lg backdrop-blur-lg"
    >
      <div className="relative flex items-center">
        <TextareaAutosize
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your medical question..."
          minRows={1}
          maxRows={6}
          className="w-full resize-none px-5 py-3 rounded-xl border-2 border-[#00b7c2] bg-white/80 focus:outline-none focus:border-[#00415a] focus:ring-2 focus:ring-[#00b7c2] text-base transition placeholder:italic shadow-md"
          disabled={loading}
          aria-label="Medical Chat Input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-3 bottom-2 rounded-full bg-gradient-to-br from-[#00b7c2] to-[#00415a] hover:scale-105 hover:brightness-110 active:scale-95 text-white p-4 transition shadow-xl focus:outline-none focus:ring-2 focus:ring-[#00b7c2]"
          title="Send"
        >
          <FiSend className="text-xl" />
        </button>
      </div>
    </form>
  );

  return (
    <div className="relative flex flex-col h-full min-h-screen bg-transparent">
      {/* Glassy Gradient Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1350560/pexels-photo-1350560.jpeg')"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#00b7c2]/60 to-[#00415a]/80 backdrop-blur-[8px] mix-blend-multiply brightness-75" />
      </div>

      {!chatStarted ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <div className="mb-12 w-full max-w-lg text-center select-none">
            <figure className="bg-white/90 shadow-2xl rounded-2xl px-8 py-10 border border-[#e3f6f5] backdrop-blur-lg">
              <blockquote className="text-2xl md:text-3xl font-semibold italic text-[#00415a] drop-shadow-md">
                “{quote.quote}”
              </blockquote>
              <figcaption className="mt-6 text-[#00b7c2] font-medium uppercase tracking-wide">
                — {quote.author}
              </figcaption>
            </figure>
          </div>
          <div className="w-full">{inputArea}</div>
        </div>
      ) : (
        <>
          {/* Chat area */}
          <div className="relative z-10 flex-1 overflow-y-auto py-4 pt-20 pb-32">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
               <div
                 key={i}
                 className={`flex items-start lg:gap-4 gap-1 ${
                   msg.sender === "user" ? " flex-row-reverse" : "justify-start flex-row"
                 }`}
               >
                  {msg.sender === "bot" && (
                   <span className="rounded-full lg:p-2 px-1 py-1  bg-[#0e5089] text-white shadow-lg shrink-0 border-[3px] border-white">
                     <FiCpu className="text-2xl" />
                   </span>
                 )}
                 {/* User avatar */}
                 {msg.sender === "user" && (
                   <span className="rounded-full lg:p-2 px-1 py-1  bg-[#0e5089] text-white shadow-lg shrink-0 border-[3px] border-white">
                     <FiUser className="text-2xl" />
                   </span>
                 )}
               
             
                 {/* Message bubble */}
                 <div
                   className={`
                      lg:px-6 px-1 lg:py-4 py-1 rounded-2xl  text-base max-w-[100%] 
                      ${
                        msg.sender === "bot"
                          ? " text-[#ffffff] "
                          : "bg-gradient-to-tl from-[#00b7c2] px-4 py-2 shadow-lg to-[#00415a] text-white border-[#00b7c2]"
                      }
                   `}
                   style={{
                     fontFamily: msg.sender === "bot" ? "Segoe UI, Arial, sans-serif" : undefined,
                   }}
                   tabIndex={0}
                 >

                   {msg.sender === "bot" ? (
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                   ) : (
                     <span>{msg.text}</span>
                   )}
                 </div>
               
                 {/* Bot avatar */}
                 
               </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input at bottom, glassmorphism */}
          <div className="fixed bottom-0 left-0 w-full px-0 lg:py-4 py-1 bg-[#00415a] backdrop-blur-lg border-t shadow-2xl z-20">
            {inputArea}
          </div>
        </>
      )}
    </div>
  );
}
