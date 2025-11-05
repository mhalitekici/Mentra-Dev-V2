import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      toast.success('Şifreniz başarıyla güncellendi');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-600 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Yeni Şifre
          </h1>
          <p className="text-gray-600">Yeni şifrenizi belirleyin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="password">Yeni Şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
              data-testid="reset-password-input"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1"
              data-testid="reset-password-confirm-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg"
            disabled={loading}
            data-testid="reset-password-submit-button"
          >
            {loading ? 'Güncelleniyor...' : 'Şifre Güncelle'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-teal-600 hover:text-teal-700 text-sm inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Girişe geri dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
