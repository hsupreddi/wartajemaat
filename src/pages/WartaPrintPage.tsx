import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FullWartaData, PengaturanHuria, JadwalTetapItem } from '../types';
import { getWartaById, getPengaturan, getJadwalTetap } from '../lib/wartaStorage';
import { PrintLayout } from '../components/warta/PrintLayout';

export const WartaPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<FullWartaData | null>(null);
  const [pengaturan, setPengaturan] = useState<PengaturanHuria>();
  const [jadwalTetap, setJadwalTetap] = useState<JadwalTetapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getWartaById(id), getPengaturan(), getJadwalTetap()])
      .then(([wartaData, setts, jadwals]) => {
        setData(wartaData);
        setPengaturan(setts);
        setJadwalTetap(jadwals);
      })
      .catch((err) => {
        console.warn('Gagal memuat lembar cetak warta:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs text-stone-600">Menyiapkan lembar cetak A4...</p>
        </div>
      </div>
    );
  }

  return (
    <PrintLayout
      data={data}
      pengaturan={pengaturan}
      jadwalTetap={jadwalTetap}
      selectedPage="all"
    />
  );
};
