import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
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
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        }
      );
      
      const userInfo = await userInfoResponse.json();
      
      // Update state
      setIsAuthenticated(true);
      setUserInfo(userInfo);
      setAccessToken(response.access_token);
      
      // Update localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('accessToken', response.access_token);
      
      navigate('/appointment-form');
    } catch (error) {
      console.error('Error fetching user info:', error);
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