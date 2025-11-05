import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { GraduationCap, Calendar, FileText, TrendingUp, Users, CheckCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Öğrenci Yönetimi',
      description: 'Öğrencilerinizi kolayca yönetin, bilgilerini takip edin'
    },
    {
      icon: Calendar,
      title: 'Akıllı Takvim',
      description: 'Haftalık ders programınızı düzenleyin ve takip edin'
    },
    {
      icon: FileText,
      title: 'Detaylı Raporlar',
      description: 'Velilere profesyonel PDF raporları gönderin'
    },
    {
      icon: TrendingUp,
      title: 'Gelir Takibi',
      description: 'Ödemelerinizi ve kazançlarınızı kolayca yönetin'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-purple-600 to-pink-600 border-b border-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/logo.png" alt="Mentra" className="h-12 w-12" />
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => navigate('/login')}
                variant="ghost"
                className="text-white hover:bg-purple-700"
              >
                Giriş Yap
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                Kayıt Ol
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="Mentra Logo" className="h-32 w-32 animate-pulse" />
          </div>
          <h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Mentra
          </h1>
          <p className="text-2xl sm:text-3xl text-gray-700 font-medium mb-4">
            Özel Ders Yönetiminde Yeni Nesil Platform
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Öğrencilerinizi, derslerinizi ve ödemelerinizi tek bir platformdan yönetin. 
            Profesyonel raporlar oluşturun, velilerle iletişim kurun.
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg"
            >
              Hemen Başla
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-6 text-lg"
            >
              Giriş Yap
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="glass rounded-2xl p-6 card-hover text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-20 glass rounded-3xl p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-2">1000+</div>
              <div className="text-gray-600">Mutlu Öğretmen</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-pink-600 mb-2">5000+</div>
              <div className="text-gray-600">Yönetilen Öğrenci</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-2">%99</div>
              <div className="text-gray-600">Memnuniyet Oranı</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center glass rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Hazır mısınız?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Ücretsiz hesap oluşturun ve özel ders yönetiminizi kolaylaştırın
          </p>
          <Button
            onClick={() => navigate('/register')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-xl"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            Ücretsiz Başla
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-lg">© 2024 Mentra. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
