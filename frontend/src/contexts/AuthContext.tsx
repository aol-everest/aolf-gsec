import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  email_notification_preferences?: {
    appointment_created: boolean;
    appointment_updated: boolean;
    new_appointment_request: boolean;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (response: any) => Promise<void>;
  logout: () => void;
  updateUserInfo: (updates: Partial<UserInfo>) => Promise<void>;
  refreshUserInfo: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const handleTokenExpiration = () => {
    console.log('Token has expired, logging out...');
    logout();
    navigate('/', { replace: true });
  };

  const refreshUserInfo = async () => {
    try {
      const response = await fetch('http://localhost:8001/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const updatedUserInfo = {
          ...userInfo,
          ...data,
        };
        setUserInfo(updatedUserInfo);
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      } else if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.detail === 'Token has expired') {
          handleTokenExpiration();
        }
      }
    } catch (error) {
      console.error('Error refreshing user info:', error);
    }
  };

  const updateUserInfo = async (updates: Partial<UserInfo>) => {
    try {
      const response = await fetch('http://localhost:8001/users/me/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await refreshUserInfo();
      } else if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.detail === 'Token has expired') {
          handleTokenExpiration();
        } else {
          throw new Error('Failed to update user info');
        }
      }
    } catch (error) {
      console.error('Error updating user info:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check localStorage on mount
        const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedToken = localStorage.getItem('accessToken');

        if (storedAuth && storedToken) {
          setIsAuthenticated(true);
          setUserInfo(storedUserInfo ? JSON.parse(storedUserInfo) : null);
          setAccessToken(storedToken);
          await refreshUserInfo();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear any invalid state
        setIsAuthenticated(false);
        setUserInfo(null);
        setAccessToken(null);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
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
      console.log('User info (extracted from ID token):', userInfo); // Debug log
      console.log('User info (from backend):', tokenData.user); // Debug log
      // Merge tokenData.user into userInfo
      const mergedUserInfo = { ...userInfo, ...tokenData.user };
      
      // Update state
      setIsAuthenticated(true);
      setUserInfo(mergedUserInfo);
      setAccessToken(tokenData.access_token);
      
      // Update localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userInfo', JSON.stringify(mergedUserInfo));
      localStorage.setItem('accessToken', tokenData.access_token);
      localStorage.setItem('role', mergedUserInfo.role);

      // Handle redirect
      const redirectUrl = localStorage.getItem('redirectUrl');
      if (redirectUrl) {
        localStorage.removeItem('redirectUrl'); // Clear the stored URL
        navigate(redirectUrl);
      } else {
        navigate('/home'); // Default to home page if no redirect URL
      }
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
    localStorage.removeItem('redirectUrl'); // Also clear any stored redirect URL
    
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userInfo,
        accessToken,
        isLoading,
        login,
        logout,
        updateUserInfo,
        refreshUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 