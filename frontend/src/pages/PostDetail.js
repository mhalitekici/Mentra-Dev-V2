import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { Heart, MessageCircle, Trash2, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const PostDetail = () => {
  const { postId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
    checkIfLiked();
    fetchLikesCount();
    fetchComments();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPost(response.data);
    } catch (error) {
      toast.error('Gönderi yüklenemedi');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/posts/${postId}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const likes = response.data;
      setLikesCount(likes.length);
      setLiked(likes.some(like => like.user_id === user?.id));
    } catch (error) {
      console.error('Error checking likes:', error);
    }
  };

  const fetchLikesCount = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/posts/${postId}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikesCount(response.data.length);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(`${API}/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    } catch (error) {
      toast.error('Beğeni işlemi başarısız');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(
        `${API}/posts/${postId}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      fetchComments();
      toast.success('Yorum eklendi');
    } catch (error) {
      toast.error('Yorum eklenemedi');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchComments();
      toast.success('Yorum silindi');
    } catch (error) {
      toast.error('Yorum silinemedi');
    }
  };

  const handleDeletePost = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Gönderi silindi');
      navigate('/home');
    } catch (error) {
      toast.error('Gönderi silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Gönderi bulunamadı</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>

        {/* Post Card */}
        <Card className="p-6 mb-6">
          {/* Post Header */}
          <div className="flex items-start justify-between mb-4">
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate(`/teachers/${post.author_username}`)}
            >
              <Avatar className="h-14 w-14">
                <AvatarImage 
                  src={post.author_avatar ? `${process.env.REACT_APP_BACKEND_URL}${post.author_avatar}` : ''} 
                />
                <AvatarFallback><User className="w-7 h-7" /></AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{post.author_name}</h3>
                <p className="text-sm text-gray-500">@{post.author_username}</p>
                <p className="text-xs text-gray-400">
                  {new Date(post.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            {user?.id === post.author_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePost}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Post Content */}
          <div className="mb-6">
            <p className="text-gray-800 text-lg whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Post Actions */}
          <div className="flex items-center space-x-6 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center space-x-2 ${liked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              <span className="font-semibold">{likesCount}</span>
            </Button>
            <div className="flex items-center space-x-2 text-gray-500">
              <MessageCircle className="w-6 h-6" />
              <span className="font-semibold">{comments.length} Yorum</span>
            </div>
          </div>
        </Card>

        {/* Add Comment */}
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">Yorum Yap</h3>
          <div className="flex space-x-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage 
                src={user?.avatar ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar}` : ''} 
              />
              <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Yorumunuzu yazın..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none mb-3"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Yorum Yap
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Comments List */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Yorumlar ({comments.length})</h3>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Henüz yorum yok</div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar 
                    className="h-10 w-10 cursor-pointer flex-shrink-0"
                    onClick={() => navigate(`/teachers/${comment.user_id}`)}
                  >
                    <AvatarImage 
                      src={comment.user_avatar ? `${process.env.REACT_APP_BACKEND_URL}${comment.user_avatar}` : ''} 
                    />
                    <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-gray-900">{comment.user_name}</h4>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">{comment.content}</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 px-2">
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PostDetail;
