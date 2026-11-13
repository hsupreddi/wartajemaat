/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { PublicPortalPage } from './pages/PublicPortalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { WartaEditorPage } from './pages/WartaEditorPage';
import { WartaPrintPage } from './pages/WartaPrintPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { LoginPage } from './pages/LoginPage';
import { ArsipWartaPage } from './pages/ArsipWartaPage';
import { CetakContohPage } from './pages/CetakContohPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Frontpage for congregation members */}
            <Route path="/" element={<PublicPortalPage />} />

            {/* Public & Staff Archive Collection */}
            <Route path="/arsip" element={<ArsipWartaPage />} />

            {/* Dev / Audit route for visual comparison with original physical document */}
            <Route path="/dev/cetak-contoh" element={<CetakContohPage />} />

            {/* Direct A4 Print and PDF route */}
            <Route path="/warta/:id/print" element={<WartaPrintPage />} />

            {/* Authentication & Role Switcher */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin & Staff Routes */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/warta/:id/edit" element={<WartaEditorPage />} />
            <Route path="/admin/master" element={<MasterDataPage />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
