import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

type AuthContextType = {
  session: Session | null;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provides authentication state and Supabase client to its children.
 * It handles session management and redirects users based on their auth status.
 * - Unauthenticated users are redirected to `/login`.
 * - Authenticated users on the `/login` page are redirected to `/dashboard`.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to render.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Listen for changes in authentication state (e.g., sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Get the initial session on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Handle route protection
  useEffect(() => {
    if (!loading) {
      const isAuthPage = location.pathname === '/login';
      // Public paths are accessible without authentication
      const isPublicPath = isAuthPage || location.pathname.startsWith('/board/');
      
      if (!session && !isPublicPath) {
        navigate('/login');
      } else if (session && isAuthPage) {
        navigate('/dashboard');
      }
    }
  }, [session, loading, navigate, location.pathname]);

  // Display a loading indicator while the session is being fetched
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ session, supabase }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the authentication context.
 * @returns {AuthContextType} The authentication context including the session and Supabase client.
 * @throws {Error} If used outside of an `AuthProvider`.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};