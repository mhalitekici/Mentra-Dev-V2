import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      toast.success('Şifre sıfırlama bağlantısı email adresinize gönderildi');
      setEmail('');
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-600 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Şifremi Unuttum
          </h1>
          <p className="text-gray-600">Email adresinize sıfırlama bağlantısı gönderelim</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              data-testid="forgot-password-email-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg"
            disabled={loading}
            data-testid="forgot-password-submit-button"
          >
            {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
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

export default ForgotPassword;
