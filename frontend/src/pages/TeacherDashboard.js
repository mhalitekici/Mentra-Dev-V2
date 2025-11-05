import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Users, Calendar, Banknote, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showNotAttendedDialog, setShowNotAttendedDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completeData, setCompleteData] = useState({
    topic: '',
    weaknesses: '',
    homework: '',
    note: ''
  });
  const [notAttendedNote, setNotAttendedNote] = useState('');
  const [rescheduleStep, setRescheduleStep] = useState('reason'); // reason, confirm, datepicker
  const [rescheduleData, setRescheduleData] = useState({
    date: null,
    startTime: '',
    endTime: '',
  });

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

  const getFirstName = (fullName) => {
    return fullName?.split(' ')[0] || fullName;
  };

  const handleCompleteLesson = (lesson) => {
    setSelectedLesson(lesson);
    setCompleteData({ topic: lesson.topic || '', weaknesses: '', homework: '', note: '' });
    setShowCompleteDialog(true);
  };

  const handleNotAttended = (lesson) => {
    setSelectedLesson(lesson);
    setNotAttendedNote('');
    setRescheduleStep('reason');
    setShowNotAttendedDialog(true);
  };

  const submitCompleteLesson = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/lessons/${selectedLesson.lesson_id}/complete-with-details`,
        completeData,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: completeData
        }
      );
      toast.success('Ders tamamlandı ve kaydedildi!');
      setShowCompleteDialog(false);
      fetchStats();
    } catch (error) {
      toast.error('Ders kaydedilemedi');
    }
  };

  const submitNotAttended = async (reschedule = false) => {
    try {
      const token = localStorage.getItem('mentra_token');

      let payload;
      let url = `${API}/lessons/${selectedLesson.lesson_id}/not-attended-and-reschedule`;

      if (reschedule) {
        payload = {
          original_date: selectedLesson.date,
          reason: notAttendedNote,
          reschedule: true,
          new_date: rescheduleData.date,
          new_start_time: rescheduleData.startTime,
          new_end_time: rescheduleData.endTime
        };
      } else {
        payload = {
          original_date: selectedLesson.date,
          reason: notAttendedNote,
          reschedule: false
        };
      }

      await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (reschedule) {
        toast.success('Ders ertelendi ve kaydedildi!');
      } else {
        toast.success('Ders yapılmadı olarak işaretlendi');
      }

      setShowNotAttendedDialog(false);
      fetchStats();
    } catch (error) {
      if (error.response && error.response.status === 409) {
        toast.error('Seçilen zaman diliminde başka bir ders var.');
      } else {
        toast.error('İşlem başarısız oldu');
      }
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
            Merhaba, {getFirstName(user?.full_name)} Hocam 👋
          </h1>
          <p className="text-gray-600">Bugün ne yapmak istersiniz?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass p-6 card-hover" data-testid="stat-students">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Öğrenci Sayısı</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.students_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="glass p-6 card-hover" data-testid="stat-lessons">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Haftalık Ders</p>
                <p className="text-3xl font-bold text-pink-600">{stats?.weekly_lessons || 0}</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-600" />
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
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{lesson.student_name}</p>
                    <p className="text-sm text-gray-600">{lesson.topic || 'Konu belirtilmemiş'}</p>
                    <p className="text-sm text-purple-600 mt-1">{lesson.start_time} - {lesson.end_time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {lesson.status === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleCompleteLesson(lesson)}
                          data-testid="complete-lesson-btn"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Ders Yapıldı
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleNotAttended(lesson)}
                          data-testid="not-attended-btn"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Yapılmadı
                        </Button>
                      </>
                    )}
                    {lesson.status === 'completed' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Tamamlandı
                      </span>
                    )}
                    {lesson.status === 'not_attended' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        Yapılmadı
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Complete Lesson Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ders Detayları - {selectedLesson?.student_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">Konu *</Label>
              <Input
                id="topic"
                value={completeData.topic}
                onChange={(e) => setCompleteData({...completeData, topic: e.target.value})}
                placeholder="Bugün hangi konuyu işlediniz?"
                required
              />
            </div>
            <div>
              <Label htmlFor="weaknesses">Eksikler</Label>
              <Textarea
                id="weaknesses"
                value={completeData.weaknesses}
                onChange={(e) => setCompleteData({...completeData, weaknesses: e.target.value})}
                placeholder="Öğrencinin eksikleri neler?"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="homework">Ödev</Label>
              <Textarea
                id="homework"
                value={completeData.homework}
                onChange={(e) => setCompleteData({...completeData, homework: e.target.value})}
                placeholder="Verdiğiniz ödevi yazın"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="note">Not</Label>
              <Textarea
                id="note"
                value={completeData.note}
                onChange={(e) => setCompleteData({...completeData, note: e.target.value})}
                placeholder="Ekstra notlarınız"
                rows={2}
              />
            </div>
            <Button
              onClick={submitCompleteLesson}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!completeData.topic}
            >
              Kaydet ve Tamamla
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Not Attended Dialog */}
      <Dialog open={showNotAttendedDialog} onOpenChange={setShowNotAttendedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ders Yapılmadı - {selectedLesson?.student_name}</DialogTitle>
          </DialogHeader>
          {rescheduleStep === 'reason' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="notAttendedNote">Neden ders yapılmadı? (Mazeret)</Label>
                <Textarea
                  id="notAttendedNote"
                  value={notAttendedNote}
                  onChange={(e) => setNotAttendedNote(e.target.value)}
                  placeholder="Örn: Öğrenci rahatsızdı."
                  rows={3}
                  required
                />
              </div>
              <Button
                onClick={() => setRescheduleStep('confirm')}
                className="w-full"
                disabled={!notAttendedNote}
              >
                Devam
              </Button>
            </div>
          )}
          {rescheduleStep === 'confirm' && (
            <div className="space-y-4">
              <p>Dersi başka güne atamak ister misiniz?</p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => submitNotAttended(false)}>Hayır</Button>
                <Button onClick={() => setRescheduleStep('datepicker')}>Evet</Button>
              </div>
            </div>
          )}
          {rescheduleStep === 'datepicker' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reschedule-date">Yeni Tarih</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reschedule-start">Başlangıç</Label>
                  <Input
                    id="reschedule-start"
                    type="time"
                    onChange={(e) => setRescheduleData({...rescheduleData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="reschedule-end">Bitiş</Label>
                  <Input
                    id="reschedule-end"
                    type="time"
                    onChange={(e) => setRescheduleData({...rescheduleData, endTime: e.target.value})}
                  />
                </div>
              </div>
              <Button
                onClick={() => submitNotAttended(true)}
                className="w-full"
                disabled={!rescheduleData.date || !rescheduleData.startTime || !rescheduleData.endTime}
              >
                Dersi Ertele
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
