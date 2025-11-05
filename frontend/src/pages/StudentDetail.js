import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Trash2, FileDown, Mail } from 'lucide-react';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const [studentRes, lessonsRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/students/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/lessons?student_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/payments?student_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStudent(studentRes.data);
      setEditData(studentRes.data);
      setLessons(lessonsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      toast.error('Veri yüklenemedi');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.put(`${API}/students/${id}`, {
        ...editData,
        hourly_rate: editData.hourly_rate ? parseFloat(editData.hourly_rate) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Öğrenci güncellendi');
      setShowEdit(false);
      fetchData();
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Öğrenciyi ve tüm verilerini silmek istediğinize emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Öğrenci silindi');
      navigate('/students');
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleDownloadReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Lütfen tarih aralığı seçin');
      return;
    }
    
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(
        `${API}/reports/pdf/${id}?start_date=${startDate}&end_date=${endDate}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapor_${student.full_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Rapor indirildi');
    } catch (error) {
      toast.error('Rapor oluşturulamadı');
    }
  };

  const handleEmailReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Lütfen tarih aralığı seçin');
      return;
    }
    
    if (!student.guardian_email) {
      toast.error('Veli email adresi bulunmuyor');
      return;
    }
    
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/reports/email/${id}?start_date=${startDate}&end_date=${endDate}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Rapor veliye gönderildi');
    } catch (error) {
      toast.error('Email gönderilemedi');
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

  const totalPaid = payments.filter(p => p.status === 'Ödendi').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'Beklemede').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate('/students')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info */}
          <div className="lg:col-span-2">
            <Card className="glass p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {student.full_name}
                  </h1>
                  {student.grade && <p className="text-gray-600">{student.grade}</p>}
                </div>
                <div className="flex space-x-2">
                  <Dialog open={showEdit} onOpenChange={setShowEdit}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Öğrenciyi Düzenle</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                          <Label htmlFor="full_name">Ad Soyad</Label>
                          <Input
                            id="full_name"
                            value={editData.full_name || ''}
                            onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="grade">Sınıf</Label>
                          <Input
                            id="grade"
                            value={editData.grade || ''}
                            onChange={(e) => setEditData({...editData, grade: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="hourly_rate">Saatlik Ücret</Label>
                          <Input
                            id="hourly_rate"
                            type="number"
                            value={editData.hourly_rate || ''}
                            onChange={(e) => setEditData({...editData, hourly_rate: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="guardian_name">Veli Adı</Label>
                          <Input
                            id="guardian_name"
                            value={editData.guardian_name || ''}
                            onChange={(e) => setEditData({...editData, guardian_name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="guardian_email">Veli Email</Label>
                          <Input
                            id="guardian_email"
                            type="email"
                            value={editData.guardian_email || ''}
                            onChange={(e) => setEditData({...editData, guardian_email: e.target.value})}
                          />
                        </div>
                        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                          Güncelle
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {student.hourly_rate && (
                  <div>
                    <p className="text-sm text-gray-600">Saatlik Ücret</p>
                    <p className="text-lg font-semibold text-teal-600">{student.hourly_rate} TL</p>
                  </div>
                )}
                {student.guardian_name && (
                  <div>
                    <p className="text-sm text-gray-600">Veli</p>
                    <p className="text-lg font-semibold text-gray-800">{student.guardian_name}</p>
                  </div>
                )}
                {student.guardian_email && (
                  <div>
                    <p className="text-sm text-gray-600">Veli Email</p>
                    <p className="text-sm text-gray-800">{student.guardian_email}</p>
                  </div>
                )}
                {student.guardian_phone && (
                  <div>
                    <p className="text-sm text-gray-600">Veli Telefon</p>
                    <p className="text-sm text-gray-800">{student.guardian_phone}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Lessons */}
            <Card className="glass p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Dersler ({lessons.length})</h2>
              {lessons.length === 0 ? (
                <p className="text-gray-600 text-sm">Henüz ders eklenmemiş</p>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="p-3 bg-white rounded-lg border">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][lesson.day_of_week]}
                          </p>
                          <p className="text-sm text-gray-600">{lesson.topic || 'Konu belirtilmemiş'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-teal-600">{lesson.start_time} - {lesson.end_time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="glass p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Ödeme Özeti</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Toplam Ödeme</p>
                  <p className="text-2xl font-bold text-green-600">{totalPaid} TL</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bekleyen</p>
                  <p className="text-2xl font-bold text-orange-600">{totalPending} TL</p>
                </div>
              </div>
            </Card>

            {/* Report Generation */}
            <Card className="glass p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Rapor Oluştur</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="start_date">Başlangıç Tarihi</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Bitiş Tarihi</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleDownloadReport}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF İndir
                </Button>
                {student.guardian_email && (
                  <Button
                    onClick={handleEmailReport}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Veliye Gönder
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
