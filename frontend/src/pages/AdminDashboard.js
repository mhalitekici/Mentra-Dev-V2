import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Newspaper, Plus, Edit, Trash2, Users, FileText, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewsDialog, setShowNewsDialog] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    tags: '',
    status: 'draft'
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Bu sayfaya erişim yetkiniz yok');
      navigate('/home');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const [newsRes, usersRes, postsRes] = await Promise.all([
        axios.get(`${API}/admin/news`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/users/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/posts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setNews(newsRes.data);
      setUsers(usersRes.data);
      setPosts(postsRes.data);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast.error('Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mentra_token');
      const newsData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      if (editingNews) {
        await axios.patch(`${API}/admin/news/${editingNews.id}`, newsData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Haber güncellendi');
      } else {
        await axios.post(`${API}/admin/news`, newsData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Haber oluşturuldu');
      }
      
      setShowNewsDialog(false);
      setEditingNews(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Haber kaydedilemedi');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      tags: '',
      status: 'draft'
    });
  };

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      body: newsItem.body,
      tags: newsItem.tags.join(', '),
      status: newsItem.status
    });
    setShowNewsDialog(true);
  };

  const handleDelete = async (newsId) => {
    if (!window.confirm('Bu haberi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/admin/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Haber silindi');
      fetchData();
    } catch (error) {
      toast.error('Haber silinemedi');
    }
  };

  const handleToggleStatus = async (newsItem) => {
    try {
      const token = localStorage.getItem('mentra_token');
      const newStatus = newsItem.status === 'published' ? 'draft' : 'published';
      await axios.patch(`${API}/admin/news/${newsItem.id}`, {
        ...newsItem,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Haber ${newStatus === 'published' ? 'yayınlandı' : 'taslağa alındı'}`);
      fetchData();
    } catch (error) {
      toast.error('Durum değiştirilemedi');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Admin Paneli
          </h1>
          <p className="text-gray-600">Platform yönetimi ve içerik kontrolü</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Toplam Kullanıcı</p>
                <p className="text-4xl font-bold">{users.length}</p>
              </div>
              <Users className="w-12 h-12 text-purple-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm mb-1">Toplam Gönderi</p>
                <p className="text-4xl font-bold">{posts.length}</p>
              </div>
              <FileText className="w-12 h-12 text-pink-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Haberler</p>
                <p className="text-4xl font-bold">{news.length}</p>
              </div>
              <Newspaper className="w-12 h-12 text-purple-200" />
            </div>
          </Card>
        </div>

        {/* News Management */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Haber Yönetimi</h2>
            <Dialog open={showNewsDialog} onOpenChange={setShowNewsDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingNews(null);
                    resetForm();
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Haber
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingNews ? 'Haber Düzenle' : 'Yeni Haber Oluştur'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Başlık *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="body">İçerik *</Label>
                    <Textarea
                      id="body"
                      value={formData.body}
                      onChange={(e) => setFormData({...formData, body: e.target.value})}
                      rows={6}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Etiketler (virgülle ayırın)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="eğitim, teknoloji, öğretmen"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Durum</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="draft">Taslak</option>
                      <option value="published">Yayınlandı</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                      {editingNews ? 'Güncelle' : 'Oluştur'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowNewsDialog(false);
                        setEditingNews(null);
                        resetForm();
                      }}
                    >
                      İptal
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* News List */}
          <div className="space-y-4">
            {news.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Henüz haber yok</p>
            ) : (
              news.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                        <Badge 
                          variant={item.status === 'published' ? 'default' : 'secondary'}
                          className={item.status === 'published' ? 'bg-green-600' : 'bg-gray-400'}
                        >
                          {item.status === 'published' ? 'Yayında' : 'Taslak'}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">{item.body}</p>
                      <div className="flex items-center space-x-2">
                        {item.tags.map((tag, idx) => (
                          <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(item)}
                        title={item.status === 'published' ? 'Taslağa Al' : 'Yayınla'}
                      >
                        {item.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
