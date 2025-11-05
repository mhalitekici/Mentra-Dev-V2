import React, { useState, useEffect, useContext } from 'react';
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
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const AdminNews = () => {
  const { user } = useContext(AuthContext);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    tags: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/admin/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNews(response.data);
    } catch (error) {
      toast.error('Haberler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      if (editingNews) {
        await axios.patch(`${API}/admin/news/${editingNews.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Haber güncellendi');
      } else {
        await axios.post(`${API}/admin/news`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Haber oluşturuldu');
      }

      setShowDialog(false);
      setEditingNews(null);
      setFormData({ title: '', body: '', tags: '', status: 'draft' });
      fetchNews();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEdit = (item) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      body: item.body,
      tags: item.tags.join(', '),
      status: item.status
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu haberi silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/admin/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Haber silindi');
      fetchNews();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="glass p-8 text-center">
            <p className="text-red-600">Bu sayfaya erişim yetkiniz yok</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Haber Yönetimi
          </h1>

          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setEditingNews(null);
              setFormData({ title: '', body: '', tags: '', status: 'draft' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Haber
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingNews ? 'Haber Düzenle' : 'Yeni Haber'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Başlık</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="body">İçerik</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    rows={8}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Etiketler (virgülle ayırın)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="eğitim, teknoloji, gündem"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Durum</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="draft">Taslak</option>
                    <option value="published">Yayınla</option>
                  </select>
                </div>
                <Button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-700">
                  {editingNews ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : news.length === 0 ? (
          <Card className="glass p-8 text-center">
            <p className="text-gray-600">Henüz haber yok</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <Card key={item.id} className="glass p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                      <Badge className={item.status === 'published' ? 'bg-green-600' : 'bg-gray-600'}>
                        {item.status === 'published' ? (
                          <><Eye className="w-3 h-3 mr-1" /> Yayında</>
                        ) : (
                          <><EyeOff className="w-3 h-3 mr-1" /> Taslak</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-gray-700 mb-3 line-clamp-3">{item.body}</p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {item.published_at
                        ? `Yayınlandı: ${new Date(item.published_at).toLocaleString('tr-TR')}`
                        : `Oluşturuldu: ${new Date(item.created_at).toLocaleString('tr-TR')}`
                      }
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNews;
