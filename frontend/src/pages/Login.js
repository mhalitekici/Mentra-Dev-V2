import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      login(response.data.token, response.data.user);
      toast.success('Başarıyla giriş yaptınız!');
      navigate('/teacher-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await axios.get(`${API}/auth/google/login`);
      // Redirect to Google OAuth
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error('Google girişi başlatılamadı');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Mentra" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-purple-600 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Giriş Yap
          </h1>
          <p className="text-gray-600">Hesabınıza giriş yapın</p>
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
              data-testid="login-email-input"
            />
          </div>

          <div>
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
              data-testid="login-password-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
            disabled={loading}
            data-testid="login-submit-button"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4 py-6"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google ile Giriş Yap
          </Button>
        </div>

        <div className="mt-6 text-center space-y-3">
          <Link to="/forgot-password" className="text-purple-600 hover:text-purple-700 text-sm block">
            Şifreni mi unuttun?
          </Link>
          <div className="text-gray-600 text-sm">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-purple-600 hover:text-purple-700 font-medium">
              Kayıt ol
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
