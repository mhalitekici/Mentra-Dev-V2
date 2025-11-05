import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { User, Upload } from 'lucide-react';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    age: user?.age || '',
    subject: user?.subject || ''
  });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.put(
        `${API}/teacher/profile`,
        formData,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: formData
        }
      );
      
      // Update user context
      login(token, response.data);
      toast.success('Profil güncellendi');
    } catch (error) {
      toast.error('Güncelleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.post(
        `${API}/teacher/avatar`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Update user context
      const updatedUser = { ...user, avatar: response.data.avatar };
      login(token, updatedUser);
      toast.success('Avatar yüklendi');
    } catch (error) {
      toast.error('Avatar yüklenemedi');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Profil
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <Card className="glass p-6 lg:col-span-1">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                {user?.avatar ? (
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}${user.avatar}`}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-teal-500"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center border-4 border-teal-500">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{user?.full_name}</h2>
              <p className="text-gray-600 text-sm mb-4">{user?.email}</p>
              
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  Avatar Yükle
                </div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </Label>
            </div>
          </Card>

          {/* Profile Form */}
          <Card className="glass p-6 lg:col-span-2">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Profil Bilgileri</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="full_name">Ad Soyad</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Yaş</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Ders</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="ör: Matematik"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email}
                  disabled
                  className="mt-1 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email değiştirilemez</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 py-6 text-lg"
                disabled={loading}
                data-testid="profile-update-button"
              >
                {loading ? 'Güncelleniyor...' : 'Profili Güncelle'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
