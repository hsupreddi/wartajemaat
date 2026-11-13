import React from 'react';
import { X, FileText, Plus } from 'lucide-react';

interface TemplateOption {
  judul: string;
  isi: string;
  keterangan: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    judul: 'Ruas na Tamba (Jemaat Baru)',
    keterangan: 'Penerimaan keluarga jemaat pindahan dari huria lain',
    isi: 'Nunga ro jala manolopi gabe ruas ni hurianta: Kel. [Nama Keluarga / Suami] / [br. Istri] ro sian HKBP [Gereja Asal] Ressort [Ressort Asal], nuaeng maringanan di [Alamat], masuk tu Lingkungan [Nama Lingkungan]. Tapasahat ma tabe parhahamaranggihon.'
  },
  {
    judul: 'Tingting Nasorang (Kelahiran)',
    keterangan: 'Pemberitahuan sukacita kelahiran anak jemaat',
    isi: 'Nunga tubu sada anak/boru di Kel. [Nama Orangtua] / [br. Ibu] di ari [Hari], [Tanggal] di [Tempat Lahir]. Dakdanak dohot inana hipas. Tapasahat ma hamauliateon tu Debata.'
  },
  {
    judul: 'Tukar Mimbar Pelayan Distrik VI Dairi',
    keterangan: 'Pertukaran pelayan firman se-Distrik VI Dairi',
    isi: 'Di ari Minggu na naeng ro ([Tanggal]), masa do program Tukar Mimbar Parhalado Se-Distrik VI Dairi. Amang Pendeta Ressort Hutaraja marjamita tu [Nama Gereja Tujuan], jala na marjamita di hurianta ima [Nama Pelayan] sian [Gereja Asal].'
  },
  {
    judul: 'Tingting Marbagas / Pamasumasuon (Pernikahan)',
    keterangan: 'Warta pemberkatan nikah jemaat (Tingting I / II)',
    isi: 'Na naeng manjalo pasupasu parbagason ma: [Nama Pengantin Pria], anak ni [Nama Orangtua] sian Lingkungan [Wijk], dohot oroanna [Nama Pengantin Wanita], boru ni [Nama Orangtua] sian [Asal Huria]. Pasupasu parbagason dipatupa di ari [Hari], [Tanggal] di Gereja [Nama Gereja].'
  },
  {
    judul: 'Tardidi Na Badia (Baptisan Kudus)',
    keterangan: 'Pelayanan sakramen baptisan kudus anak',
    isi: 'Dipotonghon tu natoras na naeng paborhathon dakdanak manjalo Tardidi Na Badia asa ro paboahon tu Sintua Lingkunganna be, jala parguruan dipatupa di ari [Hari], [Tanggal] pukul [Jam] WIB di Konsistori Gereja.'
  },
  {
    judul: 'Gotong Royong Kebersihan Lingkungan Gereja',
    keterangan: 'Kegiatan kebersihan bersama parhalado & seksi',
    isi: 'Dipotonghon tu sude Parhalado, Seksi Ama, Seksi Ina, dohot Remaja Naposobulung asa rap marroan gotong royong paturehon pekarangan dohot gedung garejanta di ari [Hari], [Tanggal] pukul [Jam] WIB.'
  }
];

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: { judul: string; isi: string }) => void;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-stone-900 text-sm md:text-base">
              Pilih Template Pengumuman Resmi HKBP
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <p className="text-xs text-stone-500 mb-2">
            Klik template untuk langsung menambahkan ke daftar pengumuman Tingting Namarragam.
            Teks dalam tanda kurung kurawal [ ] dapat langsung disesuaikan.
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {TEMPLATES.map((tmpl, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelect({ judul: tmpl.judul, isi: tmpl.isi });
                  onClose();
                }}
                className="border border-stone-200 hover:border-blue-500 hover:bg-blue-50/40 p-3 rounded-md cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-stone-900 text-xs md:text-sm group-hover:text-blue-900">
                    {tmpl.judul}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold opacity-0 group-hover:opacity-100 transition">
                    <Plus className="w-3.5 h-3.5" /> Gunakan
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mb-1.5">{tmpl.keterangan}</div>
                <p className="text-xs text-stone-700 bg-white p-2 rounded border border-stone-100 font-serif-body italic">
                  "{tmpl.isi}"
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
