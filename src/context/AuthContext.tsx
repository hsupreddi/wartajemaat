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
  addUser: (user: Omit<ManagedUser, 'id' | 'tanggal_dibuat'>) => void;
  updateUserRole: (id: string, role: UserRole, jabatan?: string) => void;
  deleteUser: (id: string) => void;
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
    const saved = localStorage.getItem('hkbp_active_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.admin; // Default to admin for convenient preview
  });

  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(() => {
    const saved = localStorage.getItem('hkbp_managed_users');
    return saved ? JSON.parse(saved) : DEFAULT_MANAGED_USERS;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('hkbp_managed_users', JSON.stringify(managedUsers));
  }, [managedUsers]);

  useEffect(() => {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                const profile: UserProfile = {
                  id: data.id,
                  email: data.email || session.user.email || '',
                  nama: data.nama || 'Pengguna HKBP',
                  role: (data.role as UserRole) || 'sekretaris',
                  jabatan: data.jabatan || 'Parhalado'
                };
                setCurrentUser(profile);
                localStorage.setItem('hkbp_active_user', JSON.stringify(profile));
              }
            });
        }
      });
    }
  }, []);

  const signInAsDemo = (role: UserRole) => {
    const user = DEMO_USERS[role];
    setCurrentUser(user);
    localStorage.setItem('hkbp_active_user', JSON.stringify(user));
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        //
      }
    }
    signInAsDemo('publik');
  };

  const addUser = (newUser: Omit<ManagedUser, 'id' | 'tanggal_dibuat'>) => {
    const user: ManagedUser = {
      ...newUser,
      id: `user-${Date.now()}`,
      tanggal_dibuat: new Date().toISOString().split('T')[0]
    };
    setManagedUsers((prev) => [user, ...prev]);
  };

  const updateUserRole = (id: string, role: UserRole, jabatan?: string) => {
    setManagedUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role, ...(jabatan ? { jabatan } : {}) } : u))
    );
  };

  const deleteUser = (id: string) => {
    setManagedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const currentRole: UserRole = currentUser?.role || 'publik';

  // Specific role privileges based on requirements:
  // Admin: CRUD all
  // Sekretaris: Can edit Liturgi AND can also input financial data
  // Bendahara: Can edit financial data
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
