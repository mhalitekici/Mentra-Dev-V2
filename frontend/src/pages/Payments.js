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
import { Plus, Check, Banknote } from 'lucide-react';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [filterStudent, setFilterStudent] = useState('all');
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Ödendi'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const [paymentsRes, studentsRes] = await Promise.all([
        axios.get(`${API}/payments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPayments(paymentsRes.data);
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
      await axios.post(`${API}/payments`, {
        ...formData,
        amount: parseFloat(formData.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ödeme eklendi');
      setShowDialog(false);
      setFormData({
        student_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Ödendi'
      });
      fetchData();
    } catch (error) {
      toast.error('Ödeme eklenemedi');
    }
  };

  const handleMarkAsPaid = async (paymentId) => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.patch(`${API}/payments/${paymentId}/status?status=Ödendi`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ödeme tamamlandı');
      fetchData();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.full_name : 'Bilinmeyen';
  };

  const filteredPayments = filterStudent === 'all' 
    ? payments 
    : payments.filter(p => p.student_id === filterStudent);

  const totalPaid = payments.filter(p => p.status === 'Ödendi').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'Beklemede').reduce((sum, p) => sum + p.amount, 0);

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
            Ödemeler
          </h1>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-payment-button">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ödeme
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Ödeme Ekle</DialogTitle>
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
                  <Label htmlFor="amount">Tutar (TL) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Tarih *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Durum *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ödendi">Ödendi</SelectItem>
                      <SelectItem value="Beklemede">Beklemede</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                  Ekle
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam Ödenen</p>
                <p className="text-3xl font-bold text-green-600">{totalPaid.toFixed(2)} TL</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bekleyen Ödeme</p>
                <p className="text-3xl font-bold text-orange-600">{totalPending.toFixed(2)} TL</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Label htmlFor="filter">Öğrenciye Göre Filtrele</Label>
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-64 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öğrenciler</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payments List */}
        <Card className="glass p-6">
          {filteredPayments.length === 0 ? (
            <p className="text-center text-gray-600">Henüz ödeme kaydı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Öğrenci</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tutar</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tarih</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Durum</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-white/50">
                      <td className="py-3 px-4 text-gray-800">{getStudentName(payment.student_id)}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800">₺{payment.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-600">{payment.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'Ödendi' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {payment.status === 'Beklemede' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment.id)}
                            className="bg-green-600 hover:bg-green-700"
                            title="Ödendi Olarak İşaretle"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Payments;
