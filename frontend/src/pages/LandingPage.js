import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If user is logged in, redirect to teacher dashboard
  if (user) {
    navigate('/teacher-dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Header with Logo */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Mentra Logo" className="h-24 w-24" />
          </div>
          <h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Mentra
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 font-medium">
            Özel derslerinizi kolayca yönetin
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Login Card */}
          <div 
            className="glass rounded-3xl p-10 card-hover cursor-pointer group"
            onClick={() => navigate('/login')}
            data-testid="landing-login-card"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <ArrowRight className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Giriş Yap
              </h2>
              <p className="text-gray-600">
                Hesabınız varsa hemen giriş yapın
              </p>
            </div>
          </div>

          {/* Register Card */}
          <div 
            className="glass rounded-3xl p-10 card-hover cursor-pointer group"
            onClick={() => navigate('/register')}
            data-testid="landing-register-card"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Kayıt Ol
              </h2>
              <p className="text-gray-600">
                Yeni hesap oluşturun ve başlayın
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Özel ders yönetimi hiç bu kadar kolay olmamıştı
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
