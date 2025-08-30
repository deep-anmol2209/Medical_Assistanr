import { useState, useEffect } from "react";
import { FiMenu, FiX, FiMessageCircle, FiPlus } from "react-icons/fi";
import { useApiManager } from "../apiManager";
import { useAuthService } from "../authService";
import React from "react";

export default function Sidebar({ onSelectChat, setIsOpen, onNewChat , isOpen}) {
  ("sidebar isOpen:", isOpen);
  
  // const [isOpen, setIsOpen] = useState(false);
  const [chatList, setChatList] = useState([]); // renamed to chatList to hold conversations
  const [loading, setLoading] = useState(true);
  const { apiCall } = useApiManager();
 
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  useEffect(() => {
    async function fetchConversations() {
      try {
        // Your backend should return an array of conversations with id, title, createdAt
        const data = await apiCall("chat/getChatById"); // adjust endpoint if needed
        setChatList(data.chats || []);
      } catch (err) {
        console.error("Error fetching chats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  function handleChatClick(conversationId) {
    setSelectedConversationId(conversationId);
    if (onSelectChat) onSelectChat(conversationId);
    setIsOpen(false);
  }

  function handleNewChat() {
    setSelectedConversationId(null);
    if (onNewChat) onNewChat();
    setIsOpen(false);
  }

  return (
    <>
     
     <div
    className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
  >

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <FiX className="text-xl text-gray-600" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 pb-0 flex flex-col space-y-4">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <FiPlus className="text-lg" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="p-4 pt-2 overflow-y-auto h-[calc(100%-152px)] flex flex-col">


          {loading ? (
            <p className="text-gray-500 text-sm">Loading chats...</p>
          ) : chatList.length > 0 ? (
            <ul className="space-y-2 flex-1 overflow-y-auto">
              {chatList.map(({ conversationId, title, createdAt }) => (
                <li
                  key={conversationId}
                  onClick={() => handleChatClick(conversationId)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${selectedConversationId === conversationId
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-100"
                    }`}
                  title={title}
                >
                  <FiMessageCircle className="text-blue-600 text-lg flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-medium truncate" style={{ maxWidth: 160 }}>
                      {title || "Untitled Chat"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {createdAt ? new Date(createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No chat history found.</p>
          )}

         
        </div>
      </div>
      </div>
    </>
  );
}
