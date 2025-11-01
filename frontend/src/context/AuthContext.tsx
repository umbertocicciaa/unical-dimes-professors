import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import {
  AuthenticatedUser,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  authApi,
  api,
  setAccessToken,
} from '../api/client';

type AuthContextValue = {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'unical_dimes_access_token';
const REFRESH_TOKEN_KEY = 'unical_dimes_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);

  const persistTokens = useCallback((tokens: TokenResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    setAccessToken(tokens.access_token);
    setAccessTokenState(tokens.access_token);
    refreshTokenRef.current = tokens.refresh_token;
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setAccessTokenState(null);
    refreshTokenRef.current = null;
  }, []);

  const handleLogout = useCallback(
    async (notifyServer: boolean) => {
      const refreshToken = refreshTokenRef.current;
      clearTokens();
      setUser(null);

      if (notifyServer && refreshToken) {
        try {
          await authApi.logout({ refresh_token: refreshToken });
        } catch (error) {
          console.warn('Failed to notify server about logout', error);
        }
      }
    },
    [clearTokens],
  );

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) {
      return null;
    }
    try {
      const { data } = await authApi.refresh({ refresh_token: refreshToken });
      persistTokens(data);
      return data.access_token;
    } catch (error) {
      await handleLogout(false);
      throw error;
    }
  }, [handleLogout, persistTokens]);

  useEffect(() => {
    const initialAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    const initialRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

    const init = async () => {
      if (initialAccess && initialRefresh) {
        setAccessToken(initialAccess);
        setAccessTokenState(initialAccess);
        refreshTokenRef.current = initialRefresh;
        try {
          const { data } = await authApi.me();
          setUser(data);
        } catch (error) {
          await handleLogout(false);
        }
      }
      setLoading(false);
    };

    init();
  }, [handleLogout]);

  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = (error.config ?? {}) as (AxiosRequestConfig & { _retry?: boolean });
        const requestUrl = originalRequest.url ?? '';
        const isAuthRoute =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/register') ||
          requestUrl.includes('/auth/refresh');

        if (
          error.response?.status === 401 &&
          !isAuthRoute &&
          refreshTokenRef.current &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            const newAccessToken = await refreshAccessToken();
            if (newAccessToken) {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${newAccessToken}`,
              };
              return api(originalRequest);
            }
          } catch (refreshError) {
            await handleLogout(false);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [handleLogout, refreshAccessToken]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const { data } = await authApi.login(credentials);
      persistTokens(data);
      const profile = await authApi.me();
      setUser(profile.data);
    },
    [persistTokens],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      await authApi.register(payload);
      await login(payload);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await handleLogout(true);
  }, [handleLogout]);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user || roles.length === 0) {
        return false;
      }
      const roleNames = user.roles.map((role) => role.name);
      return roles.some((role) => roleNames.includes(role));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      loading,
      login,
      register,
      logout,
      hasRole,
    }),
    [accessToken, hasRole, loading, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
