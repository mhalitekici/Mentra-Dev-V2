import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Heart, MessageCircle, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

const PostCard = ({ post, onDelete, onUpdate }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    checkIfLiked();
    fetchLikesCount();
  }, [post.id]);

  const checkIfLiked = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/posts/${post.id}/likes`, {
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
      const response = await axios.get(`${API}/posts/${post.id}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikesCount(response.data.length);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/posts/${post.id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(`${API}/posts/${post.id}/like`, {}, {
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
        `${API}/posts/${post.id}/comments`,
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

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate(`/teachers/${post.author_username}`)}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={post.author_avatar ? `${process.env.REACT_APP_BACKEND_URL}${post.author_avatar}` : ''} 
            />
            <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">{post.author_name}</h3>
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
        {user?.id === post.author_id && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(post.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post Actions */}
      <div className="flex items-center space-x-4 pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`flex items-center space-x-2 ${liked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          <span>{likesCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleComments}
          className="flex items-center space-x-2 text-gray-500 hover:text-blue-500"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{comments.length} Yorum</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t">
          {/* Add Comment */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user?.avatar ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar}` : ''} 
                />
                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Yorum yaz..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px] resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleComment}
                    disabled={!newComment.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Yorum Yap
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {loadingComments ? (
            <div className="text-center py-4 text-gray-500">Yorumlar yükleniyor...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Henüz yorum yok</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar 
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => navigate(`/teachers/${comment.user_id}`)}
                  >
                    <AvatarImage 
                      src={comment.user_avatar ? `${process.env.REACT_APP_BACKEND_URL}${comment.user_avatar}` : ''} 
                    />
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <h4 className="font-semibold text-sm text-gray-900">{comment.user_name}</h4>
                      <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-1 px-2">
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default PostCard;
