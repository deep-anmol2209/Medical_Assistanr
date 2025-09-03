import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import Signup from "./components/Signup";
import Signin from "./components/Signin";
import ProtectedRoute from "./components/ProtectedRoutes";
import { v4 as uuidv4 } from "uuid";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useApiManager } from "./apiManager";
import "./App.css";

function ChatWrapper() {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const { apiCall } = useApiManager();
  // 1. Manage conversations here
  const [conversations, setConversations] = useState([]); // All chats
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch conversations when the component mounts or a new chat is added
  useEffect(() => {
    async function fetchConversations() {
      try {
        const data = await apiCall("chat/getChatById");
        setConversations(data.chats || []);
      } catch (err) {
        console.error("Error fetching chats:", err);
      }
    }
    fetchConversations();
  }, []);

  // Fetch messages when conversationId changes
  useEffect(() => {
    if (routeConversationId) {
      (async () => {
        try {
          const data = await apiCall(
            `chat/getMessagesByConversation?conversationId=${routeConversationId}`
          );
          setMessages(
            (data.messages || []).map((m) => ({
              sender: m.role === "assistant" ? "bot" : "user",
              text: m.content,
              createdAt: m.createdAt,
            }))
          );
        } catch (err) {
          console.error("Failed to fetch messages:", err);
          setMessages([{ sender: "bot", text: "Failed to load messages." }]);
        }
      })();
    } else {
      const newId = uuidv4();
      navigate(`/chat/${newId}`, { replace: true });
    }
  }, [routeConversationId]);

  // Handler for new chat creation (add both locally and on backend)
  const handleNewChat = () => {
    const newId = uuidv4();
    // Optimistically add new chat locally 
    setConversations(prev => [...prev, { conversationId: newId, title: "New Chat" }]);
    // Navigate to new chat route
    navigate(`/chat/${newId}`, { replace: true });
  };
  // Handler for chat selection
  const handleSelectChat = (id) => {
    if (id !== routeConversationId) {
      navigate(`/chat/${id}`, { replace: true });
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header setIsOpen={setIsOpen} isOpen={isOpen}/>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onNewChat={handleNewChat}
          setIsOpen={setIsOpen}
          isOpen={isOpen}
          onSelectChat={handleSelectChat}
          conversations={conversations} // Pass shared, up-to-date conversations here
        />
        <main className="flex-1 overflow-hidden">
          <ChatArea
            conversationId={routeConversationId}
            initialMessages={messages}
            key={routeConversationId}
          />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <Navigate to="/chat" replace />
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        />
        {/* Public routes */}
        <Route path="/sign-up/*" element={<Signup />} />
        <Route path="/sign-in/*" element={<Signin />} />
        {/* Protected Chat Layout with conversationId in URL */}
        <Route
          path="/chat/:conversationId?" // optional param
          element={
            <ProtectedRoute>
              <ChatWrapper />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
