import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
  phone_number?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  accessToken: string | null;
  login: (response: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage on mount
    const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedToken = localStorage.getItem('accessToken');

    setIsAuthenticated(storedAuth);
    setUserInfo(storedUserInfo ? JSON.parse(storedUserInfo) : null);
    setAccessToken(storedToken);
  }, []);

  const login = async (response: any) => {
    try {
      console.log('Google OAuth response:', response); // Debug log
      
      // Exchange code for tokens
      const tokensResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: response.code,
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
          client_secret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '',
          redirect_uri: 'http://localhost:3000',  // Use the same redirect URI
          grant_type: 'authorization_code',
        }),
      });

      if (!tokensResponse.ok) {
        const errorText = await tokensResponse.text();
        console.error('Token exchange failed:', errorText); // Debug log
        throw new Error(`Failed to exchange code for tokens: ${errorText}`);
      }

      const tokens = await tokensResponse.json();
      console.log('Google tokens response:', tokens); // Debug log
      
      // Verify the token with our backend
      const tokenResponse = await fetch('http://localhost:8001/verify-google-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokens.id_token
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token verification failed:', errorData); // Debug log
        throw new Error(`Failed to verify token with backend: ${errorData.detail}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Backend token response:', tokenData); // Debug log
      
      // Decode the ID token to get user info
      const base64Url = tokens.id_token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const userInfo = JSON.parse(window.atob(base64));
      
      // Update state
      setIsAuthenticated(true);
      setUserInfo(userInfo);
      setAccessToken(tokenData.access_token);
      
      // Update localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('accessToken', tokenData.access_token);
      
      navigate('/appointment-form');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = () => {
    // Clear state
    setIsAuthenticated(false);
    setUserInfo(null);
    setAccessToken(null);
    
    // Clear localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('accessToken');
    
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userInfo,
        accessToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 