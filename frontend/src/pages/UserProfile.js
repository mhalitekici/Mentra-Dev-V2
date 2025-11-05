import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { User, UserPlus, UserMinus, MessageCircle, Mail, BookOpen, Camera, Edit2, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

const UserProfile = () => {
  const { username } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile && user) {
      checkFollowing();
    }
  }, [profile, user]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/${username}`);
      setProfile(response.data.user);
      setPosts(response.data.posts);
      setBio(response.data.user.bio || '');
      setFollowerCount(response.data.follower_count || 0);
      setFollowingCount(response.data.following_count || 0);
    } catch (error) {
      toast.error('Profil yüklenemedi');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await axios.get(`${API}/users/${profile.id}/followers`);
      setFollowers(response.data);
      setShowFollowersModal(true);
    } catch (error) {
      toast.error('Takipçiler yüklenemedi');
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await axios.get(`${API}/users/${profile.id}/following`);
      setFollowing(response.data);
      setShowFollowingModal(true);
    } catch (error) {
      toast.error('Takip edilenler yüklenemedi');
    }
  };

  const checkFollowing = async () => {
    if (!profile) return;
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/users/${profile.id}/is-following`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(response.data.is_following);
    } catch (error) {
      console.error('Follow check error:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      if (isFollowing) {
        await axios.delete(`${API}/users/${profile.id}/follow`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Takipten çıkıldı');
        setFollowerCount(followerCount - 1);
      } else {
        await axios.post(`${API}/users/${profile.id}/follow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Takip edildi');
        setFollowerCount(followerCount + 1);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleMessage = async () => {
    // Check if user is admin
    if (profile?.role === 'admin') {
      toast.error('Admin kullanıcıya mesaj gönderilemez');
      return;
    }
    
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.post(`${API}/threads`, null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { recipient_id: profile.id }
      });
      navigate(`/messages/${response.data.id}`);
    } catch (error) {
      toast.error('Mesaj başlatılamadı');
    }
  };

  const handleUpdateBio = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.patch(`${API}/users/me`, null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { bio }
      });
      toast.success('Bio güncellendi');
      setEditingBio(false);
      fetchProfile();
    } catch (error) {
      toast.error('Bio güncellenemedi');
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/posts`,
        { content: newPost, media: [], visibility: 'public' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Gönderi oluşturuldu!');
      setNewPost('');
      setShowPostDialog(false);
      fetchProfile();
    } catch (error) {
      toast.error('Gönderi oluşturulamadı');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bu gönderiyi silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Gönderi silindi');
      fetchProfile();
    } catch (error) {
      toast.error('Gönderi silinemedi');
    }
  };

  const isOwnProfile = user?.username === username;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-8">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Profile Card */}
        <Card className="overflow-hidden shadow-2xl mb-8">
          {/* Gradient Cover Photo */}
          <div className="h-56 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
            {isOwnProfile && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white"
              >
                <Camera className="w-4 h-4 mr-2" />
                Kapak Değiştir
              </Button>
            )}
          </div>

          {/* Profile Content */}
          <div className="relative bg-white">
            <div className="max-w-5xl mx-auto px-6 sm:px-8">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-20 pb-6">
                {/* Avatar */}
                <div className="relative group">
                  <div className="relative">
                    <Avatar className="h-40 w-40 border-6 border-white shadow-2xl ring-4 ring-purple-100">
                      <AvatarImage src={profile?.avatar ? `${process.env.REACT_APP_BACKEND_URL}${profile.avatar}` : ''} />
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        <User className="w-20 h-20" />
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        className="absolute bottom-2 right-2 rounded-full h-12 w-12 p-0 bg-purple-600 hover:bg-purple-700 shadow-lg"
                      >
                        <Camera className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Name & Username */}
                <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0 sm:mb-4">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {profile?.full_name}
                  </h1>
                  <p className="text-lg text-gray-500 mb-2">@{profile?.username}</p>
                  {profile?.subject && (
                    <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full">
                      <BookOpen className="w-4 h-4" />
                      <span className="font-medium text-sm">{profile.subject}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && user && (
                  <div className="flex space-x-3 sm:mb-4">
                    <Button
                      onClick={handleFollow}
                      size="lg"
                      className={`${isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'} shadow-lg`}
                    >
                      {isFollowing ? <UserMinus className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                      {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                    </Button>
                    <Button onClick={handleMessage} variant="outline" size="lg" className="shadow-lg">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              <div className="border-t border-gray-200 py-6">
                <div className="grid grid-cols-3 gap-4 max-w-2xl">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{posts.length}</div>
                    <div className="text-sm text-gray-500 font-medium">Gönderi</div>
                  </div>
                  <div 
                    className="text-center cursor-pointer hover:bg-purple-50 rounded-lg py-2 transition-colors"
                    onClick={fetchFollowers}
                  >
                    <div className="text-3xl font-bold text-purple-600">{followerCount}</div>
                    <div className="text-sm text-gray-500 font-medium">Takipçi</div>
                  </div>
                  <div 
                    className="text-center cursor-pointer hover:bg-purple-50 rounded-lg py-2 transition-colors"
                    onClick={fetchFollowing}
                  >
                    <div className="text-3xl font-bold text-purple-600">{followingCount}</div>
                    <div className="text-sm text-gray-500 font-medium">Takip</div>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="border-t border-gray-200 py-6">
                {isOwnProfile && editingBio ? (
                  <div className="space-y-3">
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Hakkınızda birkaç şey yazın..."
                      rows={4}
                      className="resize-none text-base"
                    />
                    <div className="flex space-x-2">
                      <Button onClick={handleUpdateBio} className="bg-purple-600 hover:bg-purple-700">
                        <Check className="w-4 h-4 mr-2" />
                        Kaydet
                      </Button>
                      <Button onClick={() => setEditingBio(false)} variant="outline">İptal</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Hakkında</h3>
                      {isOwnProfile && (
                        <Button onClick={() => setEditingBio(true)} size="sm" variant="ghost">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Düzenle
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                      {profile?.bio || (isOwnProfile ? 'Henüz bio eklenmemiş. Kendinizi tanıtın!' : 'Bio eklenmemiş')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Posts Section */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Gönderiler
          </h2>
          {isOwnProfile && (
            <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
              <Button onClick={() => setShowPostDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Edit2 className="w-4 h-4 mr-2" />
                Yeni Gönderi
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Gönderi Oluştur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Ne düşünüyorsunuz?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleCreatePost} className="w-full bg-purple-600 hover:bg-purple-700">
                    Paylaş
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {posts.length === 0 ? (
          <Card className="glass p-12 text-center">
            <p className="text-gray-600">Henüz gönderi yok</p>
            {isOwnProfile && (
              <Button onClick={() => setShowPostDialog(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
                İlk Gönderini Oluştur
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDeletePost} onUpdate={fetchProfile} />
            ))}
          </div>
        )}

        {/* Followers Modal */}
        <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Takipçiler ({followerCount})</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {followers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Henüz takipçi yok</p>
              ) : (
                followers.map((follower) => (
                  <div 
                    key={follower.id} 
                    className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg cursor-pointer"
                    onClick={() => {
                      navigate(`/teachers/${follower.username}`);
                      setShowFollowersModal(false);
                    }}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={follower.avatar ? `${process.env.REACT_APP_BACKEND_URL}${follower.avatar}` : ''} />
                      <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-800">{follower.full_name}</p>
                      <p className="text-sm text-gray-500">@{follower.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Following Modal */}
        <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Takip Edilen ({followingCount})</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {following.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Kimseyi takip etmiyor</p>
              ) : (
                following.map((followed) => (
                  <div 
                    key={followed.id} 
                    className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg cursor-pointer"
                    onClick={() => {
                      navigate(`/teachers/${followed.username}`);
                      setShowFollowingModal(false);
                    }}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={followed.avatar ? `${process.env.REACT_APP_BACKEND_URL}${followed.avatar}` : ''} />
                      <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-800">{followed.full_name}</p>
                      <p className="text-sm text-gray-500">@{followed.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserProfile;
