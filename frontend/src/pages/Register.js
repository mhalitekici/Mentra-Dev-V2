import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    subject: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null
      });
      login(response.data.token, response.data.user);
      toast.success('Hesabınız oluşturuldu!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await axios.get(`${API}/auth/google/login`);
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error('Google girişi başlatılamadı');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-600 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Kayıt Ol
          </h1>
          <p className="text-gray-600">Yeni hesap oluşturun</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="full_name">Ad Soyad</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="mt-1"
              data-testid="register-fullname-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Yaş</Label>
              <Input
                id="age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                className="mt-1"
                data-testid="register-age-input"
              />
            </div>
            <div>
              <Label htmlFor="subject">Ders</Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                placeholder="ör: Matematik"
                className="mt-1"
                data-testid="register-subject-input"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1"
              data-testid="register-email-input"
            />
          </div>

          <div>
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1"
              data-testid="register-password-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg"
            disabled={loading}
            data-testid="register-submit-button"
          >
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
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
            Google ile Kayıt Ol
          </Button>
        </div>

        <div className="mt-6 text-center">
          <div className="text-gray-600 text-sm">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Giriş yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
