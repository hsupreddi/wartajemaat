import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ManagedUser, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  CheckCircle,
  Key,
  ShieldCheck,
  Mail,
  UserCheck
} from 'lucide-react';
import { MobileConfirmModal } from '../mobile/MobileConfirmModal';

export const UserManagement: React.FC = () => {
  const { managedUsers, addUser, updateUserRole, deleteUser, isSupabaseConnected } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sekretaris');
  const [newJabatan, setNewJabatan] = useState('Sintua Lingkungan');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    setErrorMsg(null);

    try {
      await addUser({
        nama: newName,
        email: newEmail,
        role: newRole,
        jabatan: newJabatan,
        aktif: true
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setFeedback(`Pengguna ${newName} berhasil ditambahkan sebagai ${newRole.toUpperCase()}.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menambah pengguna.');
    }
  };

  const handleUpdateRole = async (id: string, role: UserRole) => {
    setErrorMsg(null);
    try {
      await updateUserRole(id, role);
      setFeedback(`Role pengguna berhasil diperbarui menjadi ${role.toUpperCase()}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengubah role pengguna.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    setErrorMsg(null);
    try {
      await deleteUser(id);
      setFeedback(`Pengguna ${name} telah dihapus.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus pengguna.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-semibold">
          {errorMsg}
        </div>
      )}
      {isSupabaseConnected && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-xs leading-relaxed">
          <strong>Sinkronisasi Supabase Aktif:</strong> Pengurus yang didaftarkan di sini dapat langsung mendaftar (<em>Daftar Akun Baru</em>) pada halaman Masuk memakai alamat email yang sama dan otomatis memperoleh role sesuai daftar ini.
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">
              Manajemen Pengguna & Pembagian Peran (Role)
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Sebagai Admin, Anda memiliki hak penuh untuk menambah akun pengurus gereja (Sekretaris, Bendahara, Admin) dan menentukan wewenang input warta maupun keuangan.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Tambah Pengguna Baru
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            <span>Admin (Hak Akses Penuh)</span>
          </div>
          <p className="text-[11px] text-blue-800/80 leading-relaxed">
            Akses total: Tambah, edit, hapus warta, kelola kop warta & logo, atur seluruh keuangan, dan kelola akun pengguna.
          </p>
        </div>

        <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-1">
          <div className="font-bold text-purple-900 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Sekretaris Huria</span>
          </div>
          <p className="text-[11px] text-purple-800/80 leading-relaxed">
            Menyusun Tata Ibadah, Jadwal, Parhobas, Tingting Namarragam, dan <strong>dapat juga menginput data keuangan</strong>.
          </p>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-700" />
            <span>Bendahara Huria</span>
          </div>
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            Fokus menginput data keuangan (pos penerimaan standar HKBP Hutaraja, pelean taon, hamauliateon, belanja pengeluaran, dan saldo rekapitulasi).
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide">
            Daftar Akun Pengurus ({managedUsers.length})
          </h4>
        </div>

        {/* Mobile Card View (< 768px) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {managedUsers.map((u) => (
            <div key={`mob-u-${u.id}`} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-stone-900 break-words">{u.nama}</div>
                  <div className="text-[11px] font-mono text-stone-500 break-all">{u.email}</div>
                  <div className="text-xs text-stone-600 mt-0.5">{u.jabatan}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id, u.nama)}
                  className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 shrink-0 cursor-pointer"
                  title="Hapus Pengguna"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <select
                  value={u.role}
                  onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                  className={`min-h-[40px] flex-1 text-xs font-bold px-3 py-1.5 rounded-xl border capitalize cursor-pointer ${
                    u.role === 'admin'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : u.role === 'sekretaris'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <option value="admin">Admin</option>
                  <option value="sekretaris">Sekretaris</option>
                  <option value="bendahara">Bendahara</option>
                </select>
                <span className="text-[11px] text-stone-500 font-mono shrink-0">
                  {u.tanggal_dibuat}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-4 text-left font-semibold">Nama Pengguna</th>
                <th className="py-2.5 px-3 text-left font-semibold">Email</th>
                <th className="py-2.5 px-3 text-left font-semibold">Jabatan Huria</th>
                <th className="py-2.5 px-3 text-center font-semibold">Peran (Role)</th>
                <th className="py-2.5 px-3 text-center font-semibold">Tgl Terdaftar</th>
                <th className="py-2.5 px-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {managedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-4 font-bold text-stone-900">{u.nama}</td>
                  <td className="py-3 px-3 text-stone-600 font-mono text-[11px]">{u.email}</td>
                  <td className="py-3 px-3 text-stone-700">{u.jabatan}</td>
                  <td className="py-3 px-3 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                      className={`text-xs font-bold px-2.5 py-1 rounded border capitalize cursor-pointer ${
                        u.role === 'admin'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : u.role === 'sekretaris'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <option value="admin">Admin</option>
                      <option value="sekretaris">Sekretaris</option>
                      <option value="bendahara">Bendahara</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-center text-stone-500 font-mono text-[11px]">
                    {u.tanggal_dibuat}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.nama)}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                      title="Hapus Pengguna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Tambah Pengguna Pengurus</h3>
            <p className="text-xs text-stone-500 mb-4">
              Daftarkan akun baru untuk Parhalado atau pengurus huria beserta hak aksesnya.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Marudut Simarmata"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. marudut@hkbp-hutaraja.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Peran / Hak Akses (Role)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded font-semibold text-stone-800"
                >
                  <option value="admin">Admin (Akses Penuh CRUD, Kop & User)</option>
                  <option value="sekretaris">Sekretaris (Tata Ibadah, Tingting & Keuangan)</option>
                  <option value="bendahara">Bendahara (Keuangan Saja)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Jabatan / Pelayanan
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sintua Lingkungan Galatia / Parhalado Partohonan"
                  value={newJabatan}
                  onChange={(e) => setNewJabatan(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow transition"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Akses Pengguna"
        message={deleteTarget ? `Hapus akses pengurus untuk ${deleteTarget.name}?` : ''}
        confirmLabel="Ya, Hapus Akses"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
