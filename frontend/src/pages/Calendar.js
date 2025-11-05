import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Check } from 'lucide-react';

const Calendar = () => {
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    day_of_week: '0',
    start_time: '',
    end_time: '',
    topic: '',
    status: 'scheduled'
  });

  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 to 22:00

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const [lessonsRes, studentsRes] = await Promise.all([
        axios.get(`${API}/lessons`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setLessons(lessonsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      toast.error('Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mentra_token');
      if (editingLesson) {
        await axios.put(`${API}/lessons/${editingLesson.id}`, {
          ...formData,
          day_of_week: parseInt(formData.day_of_week)
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Ders güncellendi');
      } else {
        await axios.post(`${API}/lessons`, {
          ...formData,
          day_of_week: parseInt(formData.day_of_week)
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Ders eklendi');
      }
      setShowDialog(false);
      setEditingLesson(null);
      resetForm();
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Ders eklenemedi';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      day_of_week: '0',
      start_time: '',
      end_time: '',
      topic: '',
      status: 'scheduled'
    });
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      student_id: lesson.student_id,
      day_of_week: lesson.day_of_week.toString(),
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      topic: lesson.topic || '',
      status: lesson.status
    });
    setShowDialog(true);
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('Dersi silmek istediğinize emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ders silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleMarkComplete = async (lessonId) => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(`${API}/lessons/${lessonId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ders tamamlandı olarak işaretlendi');
      fetchData();
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const getLessonForSlot = (dayIndex, hour) => {
    return lessons.find(l => {
      const lessonHour = parseInt(l.start_time.split(':')[0]);
      return l.day_of_week === dayIndex && lessonHour === hour;
    });
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.full_name : 'Bilinmeyen';
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Takvim
          </h1>
          
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setEditingLesson(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-lesson-button">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ders
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingLesson ? 'Ders Düzenle' : 'Yeni Ders Ekle'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student_id">Öğrenci *</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({...formData, student_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Öğrenci seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="day_of_week">Gün *</Label>
                  <Select
                    value={formData.day_of_week}
                    onValueChange={(value) => setFormData({...formData, day_of_week: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Başlangıç *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Bitiş *</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="topic">Konu</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                  {editingLesson ? 'Güncelle' : 'Ekle'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass p-4 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="p-2 text-left text-sm font-semibold text-gray-600">Saat</th>
                {days.map((day, index) => (
                  <th key={index} className="p-2 text-center text-sm font-semibold text-gray-600">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour} className="border-t">
                  <td className="p-2 text-sm text-gray-600 font-medium">
                    {hour.toString().padStart(2, '0')}:00
                  </td>
                  {days.map((_, dayIndex) => {
                    const lesson = getLessonForSlot(dayIndex, hour);
                    return (
                      <td key={dayIndex} className="p-1">
                        {lesson ? (
                          <div className={`p-2 rounded-lg text-xs ${
                            lesson.status === 'completed' ? 'bg-green-100 border border-green-300' :
                            lesson.status === 'cancelled' ? 'bg-red-100 border border-red-300' :
                            'bg-teal-100 border border-teal-300'
                          }`}>
                            <div className="font-semibold text-gray-800 truncate">
                              {getStudentName(lesson.student_id)}
                            </div>
                            <div className="text-gray-600 truncate">{lesson.topic || 'Konu yok'}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              {lesson.start_time} - {lesson.end_time}
                            </div>
                            <div className="flex space-x-1 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2"
                                onClick={() => handleEdit(lesson)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              {lesson.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-green-600"
                                  onClick={() => handleMarkComplete(lesson.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-red-600"
                                onClick={() => handleDelete(lesson.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default Calendar;
