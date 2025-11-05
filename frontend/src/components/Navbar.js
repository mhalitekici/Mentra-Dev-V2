import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { User, GraduationCap, Calendar, CreditCard, FileText, LogOut, Settings, Lock, LayoutDashboard, MessageCircle, Search, Bell, Heart, MessageSquare, UserPlus } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';
import { Badge } from './ui/badge';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Notifications fetch error:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      const response = await axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Unread count fetch error:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      const token = localStorage.getItem('mentra_token');
      // Mark as read
      await axios.post(`${API}/notifications/${notification.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Navigate based on notification type
      if (notification.type === 'follow') {
        if (notification.actor_username) {
          navigate(`/teachers/${notification.actor_username}`);
        }
      } else if (notification.type === 'like' || notification.type === 'comment') {
        // Navigate to the specific post
        if (notification.post_id) {
          navigate(`/posts/${notification.post_id}`);
        } else {
          navigate('/home');
        }
      }
      
      setNotificationDropdownOpen(false);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Notification click error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('mentra_token');
      await axios.post(`${API}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/search/users?q=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'like':
        return `${notification.actor_name} gönderinizi beğendi`;
      case 'comment':
        return `${notification.actor_name} gönderinize yorum yaptı: "${notification.content?.substring(0, 30)}${notification.content?.length > 30 ? '...' : ''}"`;
      case 'follow':
        return `${notification.actor_name} sizi takip etmeye başladı`;
      default:
        return 'Yeni bildirim';
    }
  };

  const navItems = [
    { path: '/students', label: 'Öğrenciler', icon: GraduationCap },
    { path: '/calendar', label: 'Takvim', icon: Calendar },
    { path: '/payments', label: 'Ödemeler', icon: CreditCard },
    { path: '/reports', label: 'Raporlar', icon: FileText },
  ];

  return (
    <nav className="bg-gradient-to-r from-purple-600 to-pink-600 border-b border-purple-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? "/home" : "/"} className="flex items-center">
            <img src="/logo.png" alt="Mentra" className="h-14 w-14 hover:scale-110 transition-transform" />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`${
                      isActive
                        ? 'bg-white text-purple-600 hover:bg-gray-100'
                        : 'text-white hover:bg-purple-700'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            
            {/* Admin Link */}
            {user?.role === 'admin' && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === '/admin' ? "default" : "ghost"}
                  className={`${
                    location.pathname === '/admin'
                      ? 'bg-white text-purple-600 hover:bg-gray-100'
                      : 'text-white hover:bg-purple-700'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            
            {/* Search Bar - Expandable */}
            <div className="relative">
              {searchExpanded ? (
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Input
                      placeholder="Ara..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-64"
                      autoFocus
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            onClick={() => {
                              navigate(`/teachers/${result.username}`);
                              setSearchExpanded(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="flex items-center space-x-3 p-3 hover:bg-purple-50 cursor-pointer"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={result.avatar ? `${process.env.REACT_APP_BACKEND_URL}${result.avatar}` : ''} />
                              <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm text-gray-800">{result.full_name}</p>
                              <p className="text-xs text-gray-500">@{result.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchExpanded(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-white hover:bg-purple-700"
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setSearchExpanded(true)}
                  className="text-white hover:bg-purple-700"
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Notifications Dropdown */}
            <DropdownMenu open={notificationDropdownOpen} onOpenChange={setNotificationDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-purple-700 relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="end">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <h3 className="font-semibold text-sm">Bildirimler</h3>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={markAllAsRead}
                    >
                      Tümünü okundu işaretle
                    </Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    Henüz bildirim yok
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`cursor-pointer px-3 py-3 ${!notification.read ? 'bg-purple-50' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage 
                            src={notification.actor_avatar ? `${process.env.REACT_APP_BACKEND_URL}${notification.actor_avatar}` : ''} 
                          />
                          <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            {getNotificationIcon(notification.type)}
                            <p className="text-sm text-gray-800 line-clamp-2">
                              {getNotificationText(notification)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Messages Icon */}
            <Link to="/messages">
              <Button
                variant="ghost"
                className="text-white hover:bg-purple-700 relative"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            </Link>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-purple-700">
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage 
                      src={user?.avatar ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar}` : ''} 
                      alt={user?.full_name} 
                    />
                    <AvatarFallback className="bg-white text-purple-600">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="px-2 py-1.5 text-sm font-semibold">{user?.full_name}</div>
                <div className="px-2 py-1.5 text-xs text-gray-500">@{user?.username}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/teachers/${user?.username}`)}>
                  <User className="mr-2 h-4 w-4" />
                  Profilim
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/teacher-dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Öğretmen Dashboardı
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Ayarlar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/change-password')}>
                  <Lock className="mr-2 h-4 w-4" />
                  Şifre Değiştir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
