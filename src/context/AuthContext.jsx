import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const sendOtp = async (email) => {
    if (!supabase) throw new Error('لم يتم ربط مشروع Supabase بعد.');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  };

  const verifyOtp = async (email, token) => {
    if (!supabase) throw new Error('لم يتم ربط مشروع Supabase بعد.');
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    return data;
  };

  const enterDemo = () => {
    const user = { id: 'demo-user', email: 'student@glorytech.demo', isDemo: true };
    setDemoUser(user);
    return user;
  };

  const signOut = async () => {
    setDemoUser(null);
    if (supabase) await supabase.auth.signOut();
  };

  const user = session?.user ?? demoUser;
  const value = useMemo(
    () => ({ user, session, loading, isDemo: Boolean(demoUser), isConfigured: isSupabaseConfigured, sendOtp, verifyOtp, enterDemo, signOut }),
    [user, session, loading, demoUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
