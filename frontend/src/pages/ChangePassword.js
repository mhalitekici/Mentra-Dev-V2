import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.new_password !== formData.confirm_password) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/auth/change-password`,
        {
          current_password: formData.current_password,
          new_password: formData.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Şifreniz başarıyla değiştirildi');
      setFormData({ current_password: '', new_password: '', confirm_password: '' });
      navigate('/teacher-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şifre değiştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="glass p-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Şifre Değiştir
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="current_password">Mevcut Şifre</Label>
              <Input
                id="current_password"
                type="password"
                value={formData.current_password}
                onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="new_password">Yeni Şifre</Label>
              <Input
                id="new_password"
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirm_password">Yeni Şifre Tekrar</Label>
              <Input
                id="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                required
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
              disabled={loading}
            >
              {loading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;
