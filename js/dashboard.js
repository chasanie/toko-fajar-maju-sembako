// ================================================================
// DASHBOARD - VISUALISASI DAN STATISTIK
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { getDashboardData } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { formatRupiah } from './kasir.js';

let grafikData = [];

async function loadDashboard() {
    const cardsContainer = document.getElementById('dashboardCards');
    const produkContainer = document.getElementById('produkTerlarisContainer');
    const stokContainer = document.getElementById('stokMenipisContainer');
    const kadaluarsaContainer = document.getElementById('kadaluarsaContainer');
    const statistikContainer = document.getElementById('statistikCepatContainer');
    
    if (cardsContainer) cardsContainer.innerHTML = '<div class="loader" style="grid-column:span 4;"></div>';
    
    try {
        const session = getCurrentUser();
        const data = await getDashboardData(session.cabangId);
        
        if (cardsContainer) {
            cardsContainer.innerHTML = `
                <div class="dashboard-card" style="border-left-color:#3b82f6;">
                    <p class="label">Omzet Hari Ini</p>
                    <p class="value">Rp ${formatRupiah(data.totalOmzetHari)}</p>
                    <p class="sub">${data.totalTransaksiHari} transaksi</p>
                </div>
                <div class="dashboard-card" style="border-left-color:#22c55e;">
                    <p class="label">Omzet Minggu Ini</p>
                    <p class="value">Rp ${formatRupiah(data.totalOmzetMinggu)}</p>
                    <p class="sub">${data.totalTransaksiMinggu} transaksi</p>
                </div>
                <div class="dashboard-card" style="border-left-color:#f59e0b;">
                    <p class="label">Omzet Bulan Ini</p>
                    <p class="value">Rp ${formatRupiah(data.totalOmzetBulan)}</p>
                    <p class="sub">${data.totalTransaksiBulan} transaksi</p>
                </div>
                <div class="dashboard-card" style="border-left-color:#8b5cf6;">
                    <p class="label">Total Data</p>
                    <p class="value">${data.totalBarang}</p>
                    <p class="sub">Barang & ${data.totalPengguna} Pengguna</p>
                </div>
            `;
        }
        
        if (produkContainer) {
            if (data.produkTerlaris && data.produkTerlaris.length > 0) {
                produkContainer.innerHTML = data.produkTerlaris.map((p, i) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                        <div><span style="font-weight:700;color:#3b82f6;margin-right:8px;">#${i+1}</span><span style="font-weight:600;">${p.nama}</span></div>
                        <div style="text-align:right;"><span style="font-weight:700;">${p.qty}</span><span style="color:#64748b;font-size:12px;">terjual</span></div>
                    </div>
                `).join('');
            } else {
                produkContainer.innerHTML = `<p style="color:#94a3b8;text-align:center;padding:20px;"><i class="fas fa-box-open" style="display:block;font-size:32px;margin-bottom:8px;"></i>Belum ada penjualan hari ini</p>`;
            }
        }
        
        if (stokContainer) {
            if (data.stokMenipis && data.stokMenipis.length > 0) {
                stokContainer.innerHTML = data.stokMenipis.slice(0,5).map(p => `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">
                        <span>${p.nama}</span><span style="color:#dc2626;font-weight:700;">${p.stok} tersisa</span>
                    </div>
                `).join('');
                if (data.stokMenipis.length > 5) {
                    stokContainer.innerHTML += `<p style="color:#64748b;font-size:12px;margin-top:8px;text-align:center;">+${data.stokMenipis.length - 5} lainnya</p>`;
                }
            } else {
                stokContainer.innerHTML = `<p style="color:#22c55e;text-align:center;padding:20px;"><i class="fas fa-check-circle" style="display:block;font-size:32px;margin-bottom:8px;"></i>Semua stok aman</p>`;
            }
        }
        
        if (kadaluarsaContainer) {
            if (data.kadaluarsa && data.kadaluarsa.length > 0) {
                kadaluarsaContainer.innerHTML = data.kadaluarsa.slice(0,5).map(p => `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">
                        <span>${p.nama}</span><span style="color:#f59e0b;font-weight:700;">${p.kadaluarsa}</span>
                    </div>
                `).join('');
                if (data.kadaluarsa.length > 5) {
                    kadaluarsaContainer.innerHTML += `<p style="color:#64748b;font-size:12px;margin-top:8px;text-align:center;">+${data.kadaluarsa.length - 5} lainnya</p>`;
                }
            } else {
                kadaluarsaContainer.innerHTML = `<p style="color:#22c55e;text-align:center;padding:20px;"><i class="fas fa-calendar-check" style="display:block;font-size:32px;margin-bottom:8px;"></i>Tidak ada kadaluarsa mendekat</p>`;
            }
        }
        
        if (statistikContainer) {
            const omzetRata = data.totalTransaksiHari > 0 ? data.totalOmzetHari / data.totalTransaksiHari : 0;
            statistikContainer.innerHTML = `
                <div style="display:grid;gap:8px;">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="color:#64748b;">Rata-rata per transaksi</span>
                        <span style="font-weight:700;">Rp ${formatRupiah(omzetRata)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="color:#64748b;">Total Barang</span>
                        <span style="font-weight:700;">${data.totalBarang}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="color:#64748b;">Total Pengguna</span>
                        <span style="font-weight:700;">${data.totalPengguna}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;">
                        <span style="color:#64748b;">Status Stok</span>
                        <span style="font-weight:700;color:${data.stokMenipis.length > 0 ? '#dc2626' : '#22c55e'};">${data.stokMenipis.length > 0 ? '⚠️ ' + data.stokMenipis.length + ' menipis' : '✅ Aman'}</span>
                    </div>
                </div>
            `;
        }
        
        grafikData = data.grafik || [];
        drawGrafik(grafikData);
    } catch (e) {
        console.error('Error load dashboard:', e);
        if (cardsContainer) {
            cardsContainer.innerHTML = `<p style="color:#dc2626;grid-column:span 4;text-align:center;padding:20px;"><i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:8px;"></i>Error: ${e.message}</p>`;
        }
    }
}

function drawGrafik(data) {
    const canvas = document.getElementById('grafikCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32 || 600;
    canvas.height = 260;
    if (!data || data.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Belum ada data transaksi', canvas.width / 2, canvas.height / 2);
        return;
    }
    const width = canvas.width, height = canvas.height;
    const padding = { top: 20, bottom: 30, left: 60, right: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...data.map(d => d.total), 1);
    const barWidth = Math.min(chartWidth / data.length * 0.7, 40);
    const gap = chartWidth / data.length;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + chartHeight - (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Rp ' + formatRupiah((i / 4) * maxValue), padding.left - 8, y + 4);
    }
    data.forEach((d, i) => {
        const x = padding.left + i * gap + (gap - barWidth) / 2;
        const barHeight = (d.total / maxValue) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#93c5fd');
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(59,130,246,0.2)';
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label || d.tanggal, x + barWidth / 2, padding.top + chartHeight + 18);
        if (d.total > 0) {
            ctx.fillStyle = '#0f172a';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Rp ' + formatRupiah(d.total), x + barWidth / 2, y - 6);
        }
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Total Omzet per Hari (Rp)', width / 2, 12);
}

export { loadDashboard, drawGrafik, grafikData };

window.loadDashboard = loadDashboard;
window.drawGrafik = drawGrafik;
window.grafikData = grafikData;