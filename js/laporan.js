// ================================================================
// LAPORAN - STATISTIK DAN ANALISIS
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase, getData } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast, formatRupiah } from './kasir.js';

// ================================================================
// LOAD LAPORAN
// ================================================================

async function loadLaporan() {
    const container = document.getElementById('laporanContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    
    try {
        const session = getCurrentUser();
        const periode = document.getElementById('periodeLaporan').value;
        const today = new Date().toISOString().split('T')[0];
        
        let startDate = today;
        if (periode === 'minggu') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            startDate = weekAgo.toISOString().split('T')[0];
        } else if (periode === 'bulan') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            startDate = monthAgo.toISOString().split('T')[0];
        }
        
        let query = supabase.from('transaksi').select('*').eq('cabang_id', session.cabangId);
        if (periode !== 'semua') {
            query = query.gte('tanggal', startDate);
        }
        const { data, error } = await query.order('waktu', { ascending: false });
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#64748b;">
                    <i class="fas fa-chart-line" style="font-size:48px;display:block;margin-bottom:12px;color:#cbd5e1;"></i>
                    <h4 style="color:#0f172a;">Belum ada data transaksi</h4>
                    <p style="font-size:13px;">Lakukan transaksi di menu Kasir</p>
                </div>
            `;
            return;
        }
        
        const totalOmzet = data.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        const totalTransaksi = data.length;
        
        const perKasir = {};
        data.forEach(t => {
            const kasir = t.kasir_nama || 'Unknown';
            if (!perKasir[kasir]) perKasir[kasir] = { total: 0, count: 0 };
            perKasir[kasir].total += parseFloat(t.total) || 0;
            perKasir[kasir].count += 1;
        });
        
        const metodeBayar = {};
        data.forEach(t => {
            const metode = t.metode_bayar || 'Tunai';
            metodeBayar[metode] = (metodeBayar[metode] || 0) + (parseFloat(t.total) || 0);
        });
        
        let html = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #3b82f6;">
                    <p style="color:#64748b;font-size:13px;">Total Transaksi</p>
                    <p style="font-size:24px;font-weight:800;color:#0f172a;">${totalTransaksi}</p>
                </div>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #22c55e;">
                    <p style="color:#64748b;font-size:13px;">Total Omzet</p>
                    <p style="font-size:24px;font-weight:800;color:#3b82f6;">Rp ${formatRupiah(totalOmzet)}</p>
                </div>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #f59e0b;">
                    <p style="color:#64748b;font-size:13px;">Periode</p>
                    <p style="font-size:16px;font-weight:600;color:#0f172a;">${periode === 'hari' ? 'Hari Ini' : periode === 'minggu' ? 'Minggu Ini' : periode === 'bulan' ? 'Bulan Ini' : 'Semua'}</p>
                    <p style="font-size:12px;color:#94a3b8;">${startDate} - ${today}</p>
                </div>
            </div>
        `;
        
        if (Object.keys(perKasir).length > 0) {
            html += `
                <h4 style="margin-bottom:8px;color:#0f172a;">👤 Per Kasir</h4>
                <table>
                    <thead><tr><th>Kasir</th><th style="text-align:center;">Total Transaksi</th><th style="text-align:right;">Total Omzet</th><th style="text-align:right;">Rata-rata</th></tr></thead>
                    <tbody>
            `;
            Object.keys(perKasir).forEach(k => {
                const avg = perKasir[k].count > 0 ? perKasir[k].total / perKasir[k].count : 0;
                html += `<tr><td>${k}</td><td style="text-align:center;">${perKasir[k].count}</td><td style="text-align:right;">Rp ${formatRupiah(perKasir[k].total)}</td><td style="text-align:right;">Rp ${formatRupiah(avg)}</td></tr>`;
            });
            html += '</tbody></table>';
        }
        
        if (Object.keys(metodeBayar).length > 0) {
            html += `
                <h4 style="margin-top:16px;margin-bottom:8px;color:#0f172a;">💳 Metode Pembayaran</h4>
                <table>
                    <thead><tr><th>Metode</th><th style="text-align:right;">Total</th><th style="text-align:center;">Persentase</th></tr></thead>
                    <tbody>
            `;
            Object.keys(metodeBayar).forEach(k => {
                const persen = totalOmzet > 0 ? ((metodeBayar[k] / totalOmzet) * 100).toFixed(1) : 0;
                html += `<tr><td>${k}</td><td style="text-align:right;">Rp ${formatRupiah(metodeBayar[k])}</td><td style="text-align:center;">${persen}%</td></tr>`;
            });
            html += '</tbody></table>';
        }
        
        html += `
            <h4 style="margin-top:16px;margin-bottom:8px;color:#0f172a;">📋 Detail Transaksi Terakhir (10 data)</h4>
            <table>
                <thead><tr><th>ID</th><th>Waktu</th><th>Kasir</th><th>Barang</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Total</th></tr></thead>
                <tbody>
        `;
        data.slice(0, 10).forEach(t => {
            html += `<tr><td>${t.kode_transaksi}</td><td>${new Date(t.waktu).toLocaleString()}</td><td>${t.kasir_nama}</td><td>${t.nama_barang}</td><td style="text-align:center;">${t.qty}</td><td style="text-align:right;">Rp ${formatRupiah(t.total)}</td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

async function exportExcel() {
    const periode = document.getElementById('periodeLaporan').value;
    const session = getCurrentUser();
    showNotifToast('Menyiapkan file Excel...', 'info');
    try {
        let startDate = new Date().toISOString().split('T')[0];
        if (periode === 'minggu') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            startDate = weekAgo.toISOString().split('T')[0];
        } else if (periode === 'bulan') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            startDate = monthAgo.toISOString().split('T')[0];
        }
        let query = supabase.from('transaksi').select('*').eq('cabang_id', session.cabangId);
        if (periode !== 'semua') {
            query = query.gte('tanggal', startDate);
        }
        const { data, error } = await query.order('waktu', { ascending: false });
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) {
            showNotifToast('Tidak ada data untuk diexport', 'warning');
            return;
        }
        const headers = ['ID Transaksi', 'Waktu', 'Kasir', 'Pelanggan', 'Kode Barang', 'Nama Barang', 'Satuan', 'Qty', 'Harga Satuan', 'Total', 'Metode Bayar', 'Status', 'Tanggal'];
        let csv = headers.join(',') + '\n';
        data.forEach(t => {
            const row = [
                t.kode_transaksi, t.waktu, t.kasir_nama, t.pelanggan || 'Umum',
                t.kode_barang, `"${t.nama_barang}"`, t.satuan || 'ecer', t.qty,
                t.harga_satuan, t.total, t.metode_bayar || 'Tunai', t.status || 'Selesai', t.tanggal
            ];
            csv += row.join(',') + '\n';
        });
        const totalOmzet = data.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        csv += `\n\nRINGKASAN\nTotal Transaksi,${data.length}\nTotal Omzet,${totalOmzet}\nPeriode,${startDate} - ${new Date().toISOString().split('T')[0]}\nTanggal Export,${new Date().toLocaleString()}\nCabang,${session.cabangId}\n`;
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_${periode}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotifToast('✅ Export berhasil!', 'success');
    } catch (e) {
        showNotifToast('❌ Error export: ' + e.message, 'danger');
    }
}

export { loadLaporan, exportExcel };

window.loadLaporan = loadLaporan;
window.exportExcel = exportExcel;