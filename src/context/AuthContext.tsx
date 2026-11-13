import React, { createContext, useContext, useEffect, useState } from 'react';
import { ManagedUser, UserProfile, UserRole } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentRole: UserRole;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  managedUsers: ManagedUser[];
  signInAsDemo: (role: UserRole) => void;
  signOut: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  addUser: (user: Omit<ManagedUser, 'id' | 'tanggal_dibuat'>) => Promise<void>;
  updateUserRole: (id: string, role: UserRole, jabatan?: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  canEditLiturgi: boolean;
  canEditKeuangan: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canDeleteWarta: boolean;
  canPublish: boolean;
}

const DEFAULT_MANAGED_USERS: ManagedUser[] = [
  {
    id: 'user-admin-1',
    nama: 'Pdt. H. Simanjuntak, S.Th',
    email: 'pendeta.ressort@hkbp-hutaraja.org',
    role: 'admin',
    jabatan: 'Uluan ni Huria / Pendeta Ressort',
    aktif: true,
    tanggal_dibuat: '2024-01-15'
  },
  {
    id: 'user-sekretaris-1',
    nama: 'St. Ramses Sitohang',
    email: 'sekretaris@hkbp-hutaraja.org',
    role: 'sekretaris',
    jabatan: 'Sekretaris Huria',
    aktif: true,
    tanggal_dibuat: '2024-02-01'
  },
  {
    id: 'user-bendahara-1',
    nama: 'St. M. Simarmata',
    email: 'bendahara@hkbp-hutaraja.org',
    role: 'bendahara',
    jabatan: 'Bendahara Huria',
    aktif: true,
    tanggal_dibuat: '2024-02-01'
  },
  {
    id: 'user-sekretaris-2',
    nama: 'CSt. Parlindungan Sihombing',
    email: 'sekretaris2@hkbp-hutaraja.org',
    role: 'sekretaris',
    jabatan: 'Wakil Sekretaris Huria',
    aktif: true,
    tanggal_dibuat: '2024-03-10'
  }
];

const DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: {
    id: 'user-admin-1',
    email: 'pendeta.ressort@hkbp-hutaraja.org',
    nama: 'Pdt. H. Simanjuntak, S.Th (Uluan Ressort)',
    role: 'admin',
    jabatan: 'Pendeta Ressort'
  },
  sekretaris: {
    id: 'user-sekretaris-1',
    email: 'sekretaris@hkbp-hutaraja.org',
    nama: 'St. Ramses Sitohang (Sekretaris Huria)',
    role: 'sekretaris',
    jabatan: 'Sekretaris Huria'
  },
  bendahara: {
    id: 'user-bendahara-1',
    email: 'bendahara@hkbp-hutaraja.org',
    nama: 'St. M. Simarmata (Bendahara Huria)',
    role: 'bendahara',
    jabatan: 'Bendahara Huria'
  },
  publik: {
    id: 'user-publik-0',
    email: 'jemaat@hkbp-hutaraja.org',
    nama: 'Ruas Jemaat (Akses Publik)',
    role: 'publik',
    jabatan: 'Ruas Huria'
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (isSupabaseConfigured) {
      return null;
    }
    const saved = localStorage.getItem('hkbp_active_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.admin;
  });

  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(() => {
    if (isSupabaseConfigured) {
      return [];
    }
    const saved = localStorage.getItem('hkbp_managed_users');
    return saved ? JSON.parse(saved) : DEFAULT_MANAGED_USERS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('hkbp_managed_users', JSON.stringify(managedUsers));
    }
  }, [managedUsers]);

  const refreshProfiles = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setManagedUsers(
          data.map((row: any) => ({
            id: row.id,
            nama: row.nama,
            email: row.email,
            role: (row.role as UserRole) || 'sekretaris',
            jabatan: row.jabatan || 'Parhalado',
            aktif: row.aktif !== false,
            tanggal_dibuat:
              row.tanggal_dibuat ||
              (row.created_at ? String(row.created_at).split('T')[0] : '')
          }))
        );
      }
    } catch (err) {
      console.warn('[Supabase] Gagal memuat daftar profil:', err);
    }
  };

  const loadSupabaseProfile = async (userId: string, email?: string | null) => {
    if (!supabase) return;
    try {
      let { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

      if (!data && email) {
        const resByEmail = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', email)
          .maybeSingle();
        data = resByEmail.data;
      }

      if (data) {
        const profile: UserProfile = {
          id: data.id,
          email: data.email || email || '',
          nama: data.nama || 'Pengurus HKBP',
          role: (data.role as UserRole) || 'sekretaris',
          jabatan: data.jabatan || 'Parhalado'
        };
        setCurrentUser(profile);
        await refreshProfiles();
      } else {
        setCurrentUser({
          id: userId,
          email: email || '',
          nama: email ? email.split('@')[0] : 'Pengurus HKBP',
          role: 'publik',
          jabatan: 'Belum Terverifikasi di Tabel Profiles'
        });
      }
    } catch (err) {
      console.warn('[Supabase] Gagal memuat profil user:', err);
    }
  };

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return;

    let mounted = true;
    setIsLoading(true);

    client.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          await loadSupabaseProfile(session.user.id, session.user.email);
        } else {
          setCurrentUser(null);
          setManagedUsers([]);
        }
      })
      .catch((err) => {
        console.warn('[Supabase] Gagal memeriksa sesi auth:', err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      try {
        if (session?.user) {
          await loadSupabaseProfile(session.user.id, session.user.email);
        } else {
          setCurrentUser(null);
          setManagedUsers([]);
        }
      } catch (err) {
        console.warn('[Supabase] Error auth state change:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInAsDemo = (role: UserRole) => {
    if (isSupabaseConfigured) return;
    const user = DEMO_USERS[role];
    setCurrentUser(user);
    localStorage.setItem('hkbp_active_user', JSON.stringify(user));
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setManagedUsers([]);
      return;
    }
    signInAsDemo('publik');
  };

  const addUser = async (newUser: Omit<ManagedUser, 'id' | 'tanggal_dibuat'>) => {
    const today = new Date().toISOString().split('T')[0];
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `user-${Date.now()}`;

    const user: ManagedUser = {
      ...newUser,
      id,
      tanggal_dibuat: today
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email.trim().toLowerCase(),
          nama: user.nama.trim(),
          role: user.role,
          jabatan: user.jabatan.trim(),
          aktif: user.aktif,
          tanggal_dibuat: user.tanggal_dibuat,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      );
      if (error) {
        throw new Error(`Gagal menyimpan pengguna ke Supabase: ${error.message}`);
      }
      await refreshProfiles();
      return;
    }

    setManagedUsers((prev) => [user, ...prev]);
  };

  const updateUserRole = async (id: string, role: UserRole, jabatan?: string) => {
    if (isSupabaseConfigured && supabase) {
      const payload: Record<string, any> = {
        role,
        updated_at: new Date().toISOString()
      };
      if (jabatan !== undefined) payload.jabatan = jabatan;
      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error) {
        throw new Error(`Gagal mengubah role pengguna di Supabase: ${error.message}`);
      }
      await refreshProfiles();
      return;
    }

    setManagedUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role, ...(jabatan ? { jabatan } : {}) } : u))
    );
  };

  const deleteUser = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        throw new Error(`Gagal menghapus pengguna dari Supabase: ${error.message}`);
      }
      await refreshProfiles();
      return;
    }

    setManagedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const currentRole: UserRole = currentUser?.role || 'publik';

  const canEditLiturgi = currentRole === 'admin' || currentRole === 'sekretaris';
  const canEditKeuangan =
    currentRole === 'admin' || currentRole === 'sekretaris' || currentRole === 'bendahara';
  const canManageSettings = currentRole === 'admin';
  const canManageUsers = currentRole === 'admin';
  const canDeleteWarta = currentRole === 'admin';
  const canPublish = currentRole === 'admin' || currentRole === 'sekretaris';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        managedUsers,
        signInAsDemo,
        signOut,
        refreshProfiles,
        addUser,
        updateUserRole,
        deleteUser,
        canEditLiturgi,
        canEditKeuangan,
        canManageSettings,
        canManageUsers,
        canDeleteWarta,
        canPublish
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
