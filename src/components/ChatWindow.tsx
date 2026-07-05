/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { Send, MessageSquare, ShieldAlert, UserPlus, Check } from 'lucide-react';

interface ChatWindowProps {
  currentUser: User;
  contactId: string;
  contactName: string;
  rideId?: string | null;
  authToken: string;
  onContactAdded?: () => void;
}

export default function ChatWindow({ 
  currentUser, 
  contactId, 
  contactName, 
  rideId = null, 
  authToken,
  onContactAdded 
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isContact, setIsContact] = useState<boolean>(true); // Default true to avoid flash
  const [addingContact, setAddingContact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchChatHistory = async () => {
    try {
      let url = `/api/messages?contactId=${contactId}`;
      if (rideId) {
        url = `/api/messages?rideId=${rideId}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const checkContactStatus = async () => {
    try {
      const res = await fetch('/api/contacts', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const found = data.some((c: any) => c.contactId === contactId);
        setIsContact(found);
      }
    } catch (err) {
      console.error('Error checking contact status:', err);
    }
  };

  const handleAddContact = async () => {
    setAddingContact(true);
    try {
      const res = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ contactId })
      });
      if (res.ok) {
        setIsContact(true);
        if (onContactAdded) {
          onContactAdded();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add contact.');
      }
    } catch (err) {
      console.error('Error adding contact:', err);
    } finally {
      setAddingContact(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const bodyPayload = {
      receiverId: contactId,
      content: inputText,
      rideId: rideId
    };

    setInputText('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Poll for new messages and check contact status
  useEffect(() => {
    fetchChatHistory();
    checkContactStatus();
    const interval = setInterval(fetchChatHistory, 3000);
    return () => clearInterval(interval);
  }, [contactId, rideId, authToken]);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
            {contactName.charAt(0)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{contactName}</h3>
            <p className="text-[10px] text-emerald-400">
              {rideId ? `Ride Chat Support Channel` : 'Direct Communication'}
            </p>
          </div>
        </div>
        {rideId && (
          <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
            Active Ride
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[350px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-600" />
            <p className="text-xs">No messages yet. Send a message to start communicating instantly!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm shadow ${
                    isMe
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      isMe ? 'text-slate-900/60' : 'text-slate-450'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contact Association Option for future scheduling requests */}
      {!isContact && (
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="truncate">Add <strong>{contactName}</strong> to Contacts to enable scheduling?</p>
          </div>
          <button
            type="button"
            disabled={addingContact}
            onClick={handleAddContact}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all cursor-pointer"
          >
            {addingContact ? 'Adding...' : 'Add Partner'}
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${contactName}...`}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
        />
        <button
          type="submit"
          className="bg-emerald-500 text-slate-950 rounded-lg px-3.5 py-2 hover:bg-emerald-400 transition-colors flex items-center justify-center font-bold cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
