import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

type AuthContextType = {
  session: Session | null;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = location.pathname === '/login';
      const isPublicPath = isAuthPage || location.pathname.startsWith('/board/');
      
      if (!session && !isPublicPath) {
        navigate('/login');
      } else if (session && isAuthPage) {
        navigate('/dashboard');
      }
    }
  }, [session, loading, navigate, location.pathname]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ session, supabase }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    // This check ensures that the hook is used within an AuthProvider,
    // which is a best practice for creating custom hooks with context.
    // It also narrows the type, so TypeScript knows the return value is not null.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};