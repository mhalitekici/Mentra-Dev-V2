import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Plus, User, Newspaper, Heart, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const HomeFeed = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    fetchFeed();
  }, [filterType]);

  const fetchFeed = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/feed?type=${filterType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeed(response.data);
    } catch (error) {
      console.error('Feed fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/posts`,
        { content: newPost, media: [], visibility: 'public' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Gönderi oluşturuldu!');
      setNewPost('');
      setShowCreatePost(false);
      fetchFeed();
    } catch (error) {
      toast.error('Gönderi oluşturulamadı');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Gönderi silindi');
      fetchFeed();
    } catch (error) {
      toast.error('Gönderi silinemedi');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Keşfet
            </h1>
            <p className="text-gray-600">Öğretmen topluluğundan en son gönderiler</p>
          </div>
          <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Plus className="w-5 h-5 mr-2" />
                Yeni Gönderi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Gönderi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Ne düşünüyorsunuz?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleCreatePost} className="w-full bg-purple-600 hover:bg-purple-700">
                  Paylaş
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* Filter Buttons */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            className={filterType === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Hepsi
          </Button>
          <Button
            variant={filterType === 'posts' ? 'default' : 'outline'}
            onClick={() => setFilterType('posts')}
            className={filterType === 'posts' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Gönderiler
          </Button>
          <Button
            variant={filterType === 'news' ? 'default' : 'outline'}
            onClick={() => setFilterType('news')}
            className={filterType === 'news' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Haberler
          </Button>
        </div>

        {/* Feed - Instagram Style Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        ) : feed.length === 0 ? (
          <Card className="glass p-12 text-center">
            <p className="text-gray-600 mb-4 text-lg">Henüz gönderi yok</p>
            <Button onClick={() => setShowCreatePost(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-5 h-5 mr-2" />
              İlk Gönderini Paylaş
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feed.map((item) => {
              if (item.type === 'post') {
                return (
                  <Card 
                    key={item.id} 
                    className="glass overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/posts/${item.id}`)}
                  >
                    <div className="p-6">
                      {/* Author Info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="h-12 w-12 border-2 border-purple-300">
                          <AvatarImage 
                            src={item.author_avatar ? `${process.env.REACT_APP_BACKEND_URL}${item.author_avatar}` : ''} 
                          />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{item.author_name}</p>
                          <p className="text-xs text-gray-500 truncate">@{item.author_username}</p>
                        </div>
                      </div>

                      {/* Post Content */}
                      <p className="text-gray-700 mb-4 line-clamp-4">
                        {item.content}
                      </p>

                      {/* Post Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <div className="flex items-center space-x-4 text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{item.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs">{item.comments_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Card>
                );
              } else if (item.type === 'news') {
                return (
                  <Card 
                    key={item.id} 
                    className="glass p-6 hover:shadow-2xl transition-all duration-300 border-l-4 border-purple-600 md:col-span-2 lg:col-span-3"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                          <Newspaper className="w-3 h-3 mr-1" />
                          Haber
                        </Badge>
                        <h3 className="font-bold text-xl text-gray-900">{item.title}</h3>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{item.body}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.published_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </Card>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeFeed;
