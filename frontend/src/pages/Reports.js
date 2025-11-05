import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { FileDown, Mail } from 'lucide-react';

const Reports = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      toast.error('Öğrenciler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedStudent || !startDate || !endDate) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(
        `${API}/reports/pdf/${selectedStudent}?start_date=${startDate}&end_date=${endDate}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const student = students.find(s => s.id === selectedStudent);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapor_${student?.full_name || 'ogrenci'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Rapor indirildi');
    } catch (error) {
      toast.error('Rapor oluşturulamadı');
    }
  };

  const handleEmailReport = async () => {
    if (!selectedStudent || !startDate || !endDate) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    const student = students.find(s => s.id === selectedStudent);
    if (!student?.guardian_email) {
      toast.error('Seçilen öğrencinin veli email adresi bulunmuyor');
      return;
    }

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/reports/email/${selectedStudent}?start_date=${startDate}&end_date=${endDate}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Rapor veliye email ile gönderildi');
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

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Raporlar
        </h1>

        <Card className="glass p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Öğrenci Raporu Oluştur</h2>
              <p className="text-gray-600 text-sm mb-6">
                Seçtiğiniz öğrenci için belirtilen tarih aralığında PDF rapor oluşturabilir ve veliye gönderebilirsiniz.
              </p>
            </div>

            <div>
              <Label htmlFor="student">Öğrenci Seçin</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Öğrenci seçin" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                      {student.guardian_email && (
                        <span className="text-xs text-gray-500 ml-2">({student.guardian_email})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Başlangıç Tarihi</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date">Bitiş Tarihi</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleDownloadPDF}
                className="flex-1 bg-teal-600 hover:bg-teal-700 py-6"
                data-testid="download-pdf-button"
              >
                <FileDown className="w-5 h-5 mr-2" />
                PDF Olarak İndir
              </Button>
              <Button
                onClick={handleEmailReport}
                variant="outline"
                className="flex-1 py-6 border-teal-600 text-teal-600 hover:bg-teal-50"
                data-testid="email-report-button"
              >
                <Mail className="w-5 h-5 mr-2" />
                Veliye Email Gönder
              </Button>
            </div>
          </div>
        </Card>

        <Card className="glass p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Rapor İçeriği</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Öğrenci bilgileri (ad, sınıf)</li>
            <li>• Seçilen tarih aralığındaki dersler ve konular</li>
            <li>• Ders değerlendirmeleri</li>
            <li>• Ödeme özeti (toplam ödenen ve bekleyen tutarlar)</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
