import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMyRoles, isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const NO_ROLES = { isAdmin: false, instructor: null };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [roles, setRoles] = useState(NO_ROLES);
  const [rolesLoading, setRolesLoading] = useState(isSupabaseConfigured);

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

  // Roles are fetched outside the auth callback; supabase-js must not be awaited inside it.
  const sessionUserId = session?.user?.id;
  useEffect(() => {
    if (loading) return undefined;
    if (!sessionUserId) {
      setRoles(NO_ROLES);
      setRolesLoading(false);
      return undefined;
    }
    let active = true;
    setRolesLoading(true);
    getMyRoles().then((nextRoles) => {
      if (!active) return;
      setRoles(nextRoles);
      setRolesLoading(false);
    });
    return () => { active = false; };
  }, [sessionUserId, loading]);

  const sendOtp = async (email, { shouldCreateUser = false, profile = null } = {}) => {
    if (!supabase) throw new Error('supabase_missing');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser,
        data: profile ? {
          display_name: profile.displayName,
          phone: profile.phone,
          affiliation: profile.affiliation,
        } : undefined,
      },
    });
    if (error) throw error;
  };

  const verifyOtp = async (email, token) => {
    if (!supabase) throw new Error('supabase_missing');
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    return data;
  };

  const enterDemo = (profile = {}) => {
    const user = { id: 'demo-user', email: 'student@glorytech.demo', user_metadata: { display_name: profile.displayName || null, phone: profile.phone || null, affiliation: profile.affiliation || null }, isDemo: true };
    setDemoUser(user);
    return user;
  };

  const signOut = async () => {
    setDemoUser(null);
    if (supabase) await supabase.auth.signOut();
  };

  const user = session?.user ?? demoUser;
  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      roles,
      rolesLoading: loading || rolesLoading,
      isDemo: Boolean(demoUser),
      isConfigured: isSupabaseConfigured,
      sendOtp,
      verifyOtp,
      enterDemo,
      signOut,
    }),
    [user, session, loading, roles, rolesLoading, demoUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
