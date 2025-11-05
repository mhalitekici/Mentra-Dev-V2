import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Plus, Mail, Phone, User } from 'lucide-react';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    grade: '',
    hourly_rate: '',
    last_topic: '',
    guardian_name: '',
    guardian_email: '',
    guardian_phone: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(`${API}/students`, {
        ...formData,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Öğrenci eklendi');
      setShowDialog(false);
      setFormData({
        full_name: '',
        grade: '',
        hourly_rate: '',
        last_topic: '',
        guardian_name: '',
        guardian_email: '',
        guardian_phone: ''
      });
      fetchStudents();
    } catch (error) {
      toast.error('Öğrenci eklenemedi');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Öğrenciler
          </h1>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-student-button">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Öğrenci
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Öğrenci Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Ad Soyad *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                    data-testid="student-fullname-input"
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Sınıf</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    placeholder="ör: 9. Sınıf"
                  />
                </div>
                <div>
                  <Label htmlFor="hourly_rate">Saatlik Ücret (TL)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="last_topic">Son Konu</Label>
                  <Input
                    id="last_topic"
                    value={formData.last_topic}
                    onChange={(e) => setFormData({...formData, last_topic: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="guardian_name">Veli Adı</Label>
                  <Input
                    id="guardian_name"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="guardian_email">Veli Email</Label>
                  <Input
                    id="guardian_email"
                    type="email"
                    value={formData.guardian_email}
                    onChange={(e) => setFormData({...formData, guardian_email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="guardian_phone">Veli Telefon</Label>
                  <Input
                    id="guardian_phone"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="student-submit-button">
                  Ekle
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center">Yükleniyor...</div>
        ) : students.length === 0 ? (
          <Card className="glass p-12 text-center">
            <p className="text-gray-600">Henüz öğrenci eklenmemiş</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <Link key={student.id} to={`/students/${student.id}`}>
                <Card className="glass p-6 card-hover h-full" data-testid={`student-card-${student.id}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-800 truncate">{student.full_name}</h3>
                      {student.grade && <p className="text-sm text-gray-600">{student.grade}</p>}
                      {student.hourly_rate && (
                        <p className="text-sm font-medium text-teal-600 mt-2">{student.hourly_rate} TL/saat</p>
                      )}
                      {student.guardian_name && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-gray-500">Veli: {student.guardian_name}</p>
                          {student.guardian_email && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Mail className="w-3 h-3 mr-1" />
                              {student.guardian_email}
                            </div>
                          )}
                          {student.guardian_phone && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Phone className="w-3 h-3 mr-1" />
                              {student.guardian_phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;
