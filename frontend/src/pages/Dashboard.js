import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Users, Calendar, Banknote, Clock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/teacher/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Merhaba, {user?.full_name} öğretmen 👋
          </h1>
          <p className="text-gray-600">Bugün ne yapmak istersiniz?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass p-6 card-hover" data-testid="stat-students">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Öğrenci Sayısı</p>
                <p className="text-3xl font-bold text-teal-600">{stats?.students_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </Card>

          <Card className="glass p-6 card-hover" data-testid="stat-lessons">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Haftalık Ders</p>
                <p className="text-3xl font-bold text-cyan-600">{stats?.weekly_lessons || 0}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </Card>

          <Card className="glass p-6 card-hover" data-testid="stat-payments">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bekleyen Ödeme</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.pending_payments || 0} TL</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="glass p-6 card-hover" data-testid="stat-today-lessons">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bugünkü Dersler</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.today_lessons?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Today's Lessons */}
        {stats?.today_lessons && stats.today_lessons.length > 0 && (
          <Card className="glass p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Bugünkü Dersler
            </h2>
            <div className="space-y-3">
              {stats.today_lessons.map((lesson, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-800">{lesson.student_name}</p>
                    <p className="text-sm text-gray-600">{lesson.topic}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-teal-600">{lesson.start_time} - {lesson.end_time}</p>
                    <p className="text-xs text-gray-500">{lesson.status === 'completed' ? 'Tamamlandı' : 'Planlı'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
