// src/components/auth/RequireAuth.tsx
import React from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import Config from '../../../config';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const tryFetch = async (url: string) => {
      const token = localStorage.getItem('auth_token');
      try {
        const res = await fetch(url, {
          credentials: 'include', // Optional if you're switching entirely to token-based auth
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && data.data.school) {
            localStorage.setItem('school_id', data.data.school.toString());
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const checkAuth = async () => {
      // Try IP first, fallback to localhost
      const isAuthenticated = await tryFetch(Config.backend + '/auth/me');

      setAuthenticated(isAuthenticated);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return null;

  if (!authenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
