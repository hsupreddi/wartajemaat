import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Page1TataIbadah } from '../../components/warta/Page1TataIbadah';
import { WartaMobileInteractive } from '../../components/warta/WartaMobileInteractive';
import { getInitialFullWarta } from '../mockData';

describe('Visibilitas Tabel Acara Partangiangan Lingkungan', () => {
  it('menampilkan tabel Acara Minggu dan Acara Partangiangan berdampingan (grid-cols-2) secara default', () => {
    const data = getInitialFullWarta();
    const html = renderToStaticMarkup(<Page1TataIbadah data={data} />);

    expect(html).toContain('grid-cols-2');
    expect(html).toContain('Acara Minggu');
    expect(html).toContain('Acara Partangiangan');
  });

  it('menyembunyikan tabel Acara Partangiangan dan memperlebar Acara Minggu menjadi penuh (grid-cols-1) saat tampilkan_acara_partangiangan = false', () => {
    const base = getInitialFullWarta();
    const data = {
      ...base,
      warta: {
        ...base.warta,
        tampilkan_acara_partangiangan: false
      }
    };

    const html = renderToStaticMarkup(<Page1TataIbadah data={data} />);

    expect(html).toContain('Acara Minggu');
    expect(html).not.toContain('Acara Partangiangan');
    // Top grid expands from 2 columns to 1 full-width column and adapts Acara Minggu sizing
    expect(html).toContain('grid-cols-1 avoid-break');
    expect(html).toContain('text-[7.7pt]');
    expect(html).toContain('w-[120px]');
  });

  it('menyembunyikan accordion Susunan Acara Partangiangan Lingkungan di tampilan interaktif saat flag false', () => {
    const base = getInitialFullWarta();
    const hiddenData = {
      ...base,
      warta: {
        ...base.warta,
        tampilkan_acara_partangiangan: false
      }
    };

    const htmlVisible = renderToStaticMarkup(<WartaMobileInteractive data={base} />);
    const htmlHidden = renderToStaticMarkup(<WartaMobileInteractive data={hiddenData} />);

    expect(htmlVisible).toContain('Susunan Acara Partangiangan Lingkungan');
    expect(htmlHidden).not.toContain('Susunan Acara Partangiangan Lingkungan');
    expect(htmlHidden).toContain('Susunan Tata Ibadah Minggu');
  });
});
