import { describe, it, expect } from 'vitest';
import {
  buildWartaShareUrl,
  buildWartaShareMessage,
  buildWhatsAppShareUrl
} from '../shareUtils';

describe('shareUtils', () => {
  describe('buildWartaShareUrl', () => {
    it('returns root URL when no params or beranda view only', () => {
      expect(
        buildWartaShareUrl({
          origin: 'https://ewarta.hkbp-hutaraja.org'
        })
      ).toBe('https://ewarta.hkbp-hutaraja.org/');

      expect(
        buildWartaShareUrl({
          view: 'beranda',
          origin: 'https://ewarta.hkbp-hutaraja.org'
        })
      ).toBe('https://ewarta.hkbp-hutaraja.org/');
    });

    it('encodes wartaId, reader view, and section deep-link params', () => {
      const url = buildWartaShareUrl({
        wartaId: 'w-2026-11-15',
        view: 'baca',
        sec: 'keuangan',
        origin: 'https://ewarta.hkbp-hutaraja.org'
      });

      expect(url).toBe(
        'https://ewarta.hkbp-hutaraja.org/?id=w-2026-11-15&view=baca&sec=keuangan'
      );
    });
  });

  describe('buildWartaShareMessage', () => {
    it('formats full warta summary with church name, topic, and URL', () => {
      const msg = buildWartaShareMessage({
        warta: {
          goar_minggu: 'DUNG TRINITATIS XXIII',
          tanggal_minggu: '2026-11-15',
          topik_minggu: 'Marpangunsandean tu Debata'
        },
        pengaturan: {
          nama_huria: 'HKBP Ressort Hutaraja'
        },
        sectionLabel: 'Keuangan Huria',
        url: 'https://ewarta.hkbp-hutaraja.org/?id=w1&view=baca&sec=keuangan'
      });

      expect(msg).toContain('*Warta Jemaat HKBP Ressort Hutaraja*');
      expect(msg).toContain('MINGGU DUNG TRINITATIS XXIII');
      expect(msg).toContain('Marpangunsandean tu Debata');
      expect(msg).toContain('Bagian: Keuangan Huria');
      expect(msg).toContain('Baca selengkapnya: https://ewarta.hkbp-hutaraja.org/?id=w1&view=baca&sec=keuangan');
    });

    it('truncates long announcement highlight bodies cleanly at 260 chars', () => {
      const longBody = 'A'.repeat(300);
      const msg = buildWartaShareMessage({
        warta: {
          goar_minggu: 'TRINITATIS',
          tanggal_minggu: '2026-11-15',
          topik_minggu: ''
        },
        highlightTitle: 'Tingting Parhalado',
        highlightBody: longBody,
        url: 'https://ewarta.hkbp-hutaraja.org/?id=w1&view=pengumuman'
      });

      expect(msg).toContain('*Tingting Parhalado*');
      expect(msg).toContain(`${'A'.repeat(257)}...`);
      expect(msg).not.toContain('A'.repeat(265));
    });
  });

  describe('buildWhatsAppShareUrl', () => {
    it('produces properly URL-encoded wa.me share link', () => {
      const wa = buildWhatsAppShareUrl('Shalom & Horas\nBaca Warta!');
      expect(wa).toBe('https://wa.me/?text=Shalom%20%26%20Horas%0ABaca%20Warta!');
    });
  });
});
