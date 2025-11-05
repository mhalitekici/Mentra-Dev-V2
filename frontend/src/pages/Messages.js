import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { User, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Messages = () => {
  const { threadId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        selectThread(thread);
      }
    }
  }, [threadId, threads]);

  const fetchThreads = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(response.data);
    } catch (error) {
      console.error('Threads fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    navigate(`/messages/${thread.id}`);

    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/threads/${thread.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);

      // Mark as read
      await axios.post(`${API}/threads/${thread.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Messages fetch error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.post(
        `${API}/threads/${selectedThread.id}/messages`,
        { body: newMessage, media: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      toast.error('Mesaj gönderilemedi');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="glass overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Threads List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 bg-white">
                <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Mesajlar
                </h2>
              </div>

              {loading ? (
                <div className="p-4 text-center">Yükleniyor...</div>
              ) : threads.length === 0 ? (
                <div className="p-4 text-center text-gray-600">
                  Henüz mesajınız yok
                </div>
              ) : (
                <div>
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => selectThread(thread)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors ${
                        selectedThread?.id === thread.id ? 'bg-white' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={thread.other_user?.avatar ? `${process.env.REACT_APP_BACKEND_URL}${thread.other_user.avatar}` : ''}
                          />
                          <AvatarFallback>
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">
                            {thread.other_user?.full_name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {thread.last_message?.body || 'Mesaj yok'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col">
              {selectedThread ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-white flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedThread(null);
                        navigate('/messages');
                      }}
                      className="mr-2 md:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage
                        src={selectedThread.other_user?.avatar ? `${process.env.REACT_APP_BACKEND_URL}${selectedThread.other_user.avatar}` : ''}
                      />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {selectedThread.other_user?.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        @{selectedThread.other_user?.username}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            message.sender_id === user.id
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-white text-gray-800'
                          }`}
                        >
                          <p>{message.body}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === user.id ? 'text-purple-100' : 'text-gray-400'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Mesajınızı yazın..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Bir sohbet seçin
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Messages;
