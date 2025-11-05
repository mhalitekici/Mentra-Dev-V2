import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../App';
import axios from 'axios';
import { API } from '../App';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const token = searchParams.get('token');
      
      if (token) {
        // Token directly from backend redirect
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          login(token, response.data);
          navigate('/teacher-dashboard');
        } catch (error) {
          navigate('/login');
        }
      } else if (code) {
        // Exchange code for token
        try {
          const response = await axios.get(`${API}/auth/google/callback?code=${code}`);
          if (response.data.redirect) {
            window.location.href = response.data.redirect;
          }
        } catch (error) {
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="text-xl text-purple-600">Google ile giriş yapılıyor...</div>
    </div>
  );
};

export default GoogleCallback;
