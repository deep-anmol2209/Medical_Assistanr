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

  const [messages, setMessages] = useState([]);
 const  [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    ("useEffect triggered");
    ("routeConversationId:", routeConversationId);

    if (routeConversationId) {
      (async () => {
        try {
          (`Fetching messages for conversationId: ${routeConversationId}`);
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
      ("No routeConversationId found, generating new UUID and navigating.");
      const newId = uuidv4();
      navigate(`/chat/${newId}`, { replace: true });
    }
  }, [routeConversationId, navigate]);

  // Handler for chat selection
  const handleSelectChat = (id) => {
    ("handleSelectChat called with id:", id);
    if (id !== routeConversationId) {
      ("Navigating to new conversation id:", id);
      navigate(`/chat/${id}`, { replace: true });
    } else {
      ("Selected conversation is same as current route, no navigation.");
    }
  };

  // Handler for new chat creation
  const handleNewChat = () => {
    const newId = uuidv4();
    ("handleNewChat called, navigating to new conversation id:", newId);
    navigate(`/chat/${newId}`, { replace: true });
  };

  return (
    <div className="flex h-screen flex-col">
      <Header setIsOpen={setIsOpen} isOpen={isOpen}/>
      <div className="flex flex-1 overflow-hidden">
        
          <Sidebar onNewChat={handleNewChat} setIsOpen={setIsOpen} isOpen={isOpen} onSelectChat={handleSelectChat} />
        
        <main className="flex-1  overflow-hidden">
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
