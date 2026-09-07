// ================================================================
// HUTANG/PIUTANG - MANAJEMEN HUTANG DAN PIUTANG
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { getData, insertData, updateData, deleteData } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast, showLoading, hideLoading, formatRupiah } from './kasir.js';

async function loadHPTable() {
    const container = document.getElementById('hpTableContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const data = await getData('hutang_piutang', {}, { orderBy: { column: 'tanggal', ascending: false } });
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#64748b;">
                    <i class="fas fa-hand-holding-usd" style="font-size:48px;display:block;margin-bottom:12px;color:#cbd5e1;"></i>
                    <h4 style="color:#0f172a;">Belum ada data hutang/piutang</h4>
                    <p style="font-size:13px;">Catat hutang ke supplier atau piutang dari pelanggan</p>
                    <div style="margin-top:16px;">
                        <button class="btn-tambah" onclick="window.tampilFormTambahHP()" style="padding:8px 16px;font-size:13px;">
                            <i class="fas fa-plus"></i> Tambah Data
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        let totalHutang = 0, totalPiutang = 0;
        data.forEach(h => {
            if (h.tipe === 'Hutang' && h.status !== 'Lunas') totalHutang += parseFloat(h.jumlah) || 0;
            else if (h.tipe === 'Piutang' && h.status !== 'Lunas') totalPiutang += parseFloat(h.jumlah) || 0;
        });
        let html = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #dc2626;"><p style="color:#64748b;font-size:13px;">Total Hutang Belum Lunas</p><p style="font-size:24px;font-weight:800;color:#dc2626;">Rp ${formatRupiah(totalHutang)}</p></div>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #22c55e;"><p style="color:#64748b;font-size:13px;">Total Piutang Belum Lunas</p><p style="font-size:24px;font-weight:800;color:#22c55e;">Rp ${formatRupiah(totalPiutang)}</p></div>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #3b82f6;"><p style="color:#64748b;font-size:13px;">Total Data</p><p style="font-size:24px;font-weight:800;color:#0f172a;">${data.length}</p></div>
            </div>
            <div style="overflow-x:auto;">
                <table>
                    <thead><tr><th>ID</th><th>Tipe</th><th>Nama</th><th>Keterangan</th><th style="text-align:right;">Jumlah</th><th>Tanggal</th><th>Jatuh Tempo</th><th style="text-align:center;">Status</th><th style="text-align:center;">Aksi</th></tr></thead>
                    <tbody>
        `;
        data.forEach(h => {
            const isOverdue = h.jatuh_tempo && h.status !== 'Lunas' && new Date(h.jatuh_tempo) < new Date();
            html += `
                <tr style="${isOverdue ? 'background:#fef2f2;' : ''}">
                    <td><strong>${h.kode || h.id}</strong></td>
                    <td><span style="background:${h.tipe === 'Hutang' ? '#fee2e2' : '#dcfce7'};padding:2px 12px;border-radius:12px;font-size:12px;font-weight:600;color:${h.tipe === 'Hutang' ? '#dc2626' : '#16a34a'};">${h.tipe === 'Hutang' ? '📉 Hutang' : '📈 Piutang'}</span></td>
                    <td>${h.nama}</td>
                    <td>${h.keterangan || '-'}</td>
                    <td style="text-align:right;font-weight:600;color:${h.tipe === 'Hutang' ? '#dc2626' : '#16a34a'};">Rp ${formatRupiah(h.jumlah)}</td>
                    <td>${h.tanggal || '-'}</td>
                    <td>${h.jatuh_tempo || '-'}${isOverdue ? ' <span style="color:#dc2626;font-size:12px;">⚠️ OVERDUE</span>' : ''}</td>
                    <td style="text-align:center;"><span style="background:${h.status === 'Lunas' ? '#dcfce7' : '#fef3c7'};padding:2px 12px;border-radius:20px;font-size:12px;font-weight:600;color:${h.status === 'Lunas' ? '#16a34a' : '#d97706'};">${h.status === 'Lunas' ? '✅ Lunas' : '⏳ ' + h.status}</span></td>
                    <td style="text-align:center;">
                        ${h.status !== 'Lunas' ? `<button class="btn-edit" onclick="window.lunasiHP('${h.id}')" style="background:#22c55e;color:#fff;">Lunasi</button>` : `<span style="color:#94a3b8;font-size:12px;">-</span>`}
                        <button class="btn-hapus-table" onclick="window.hapusHP('${h.id}')">Hapus</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

function tampilFormTambahHP() {
    const modal = document.getElementById('modalOverlay');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Tambah Hutang/Piutang';
    document.getElementById('modalBody').innerHTML = `
        <form id="formHP" onsubmit="window.submitHP(event)">
            <div style="display:grid;gap:12px;">
                <div><label style="font-weight:600;font-size:13px;">Tipe *</label><select id="fTipeHP" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;"><option value="Hutang">📉 Hutang (ke supplier)</option><option value="Piutang">📈 Piutang (dari pelanggan)</option></select></div>
                <div><label style="font-weight:600;font-size:13px;">Nama *</label><input type="text" id="fNamaHP" required placeholder="Nama supplier/pelanggan" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Keterangan</label><input type="text" id="fKeteranganHP" placeholder="Deskripsi transaksi" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Jumlah *</label><input type="number" id="fJumlahHP" required placeholder="100000" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Tanggal</label><input type="date" id="fTanggalHP" value="${new Date().toISOString().slice(0,10)}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Jatuh Tempo</label><input type="date" id="fJatuhTempoHP" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                <button type="submit" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Simpan</button>
            </div>
        </form>
    `;
}

async function submitHP(event) {
    event.preventDefault();
    showLoading('Menyimpan data...');
    try {
        const session = getCurrentUser();
        const data = {
            kode: 'HP' + String(Date.now()).slice(-4),
            tipe: document.getElementById('fTipeHP').value,
            nama: document.getElementById('fNamaHP').value.trim(),
            keterangan: document.getElementById('fKeteranganHP').value.trim(),
            jumlah: parseFloat(document.getElementById('fJumlahHP').value) || 0,
            tanggal: document.getElementById('fTanggalHP').value,
            jatuh_tempo: document.getElementById('fJatuhTempoHP').value || null,
            status: 'Belum Lunas'
        };
        await insertData('hutang_piutang', data);
        hideLoading();
        window.tutupModal();
        showNotifToast(`✅ ${data.tipe} berhasil ditambahkan`, 'success');
        loadHPTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function lunasiHP(id) {
    if (!confirm('Tandai sebagai lunas?')) return;
    showLoading('Mengupdate status...');
    try {
        await updateData('hutang_piutang', id, { status: 'Lunas' });
        hideLoading();
        showNotifToast('✅ Status berhasil diupdate menjadi Lunas', 'success');
        loadHPTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function hapusHP(id) {
    if (!confirm('⚠️ Yakin ingin menghapus data ini?')) return;
    showLoading('Menghapus data...');
    try {
        await deleteData('hutang_piutang', id);
        hideLoading();
        showNotifToast('✅ Data berhasil dihapus', 'success');
        loadHPTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

export { loadHPTable, tampilFormTambahHP, submitHP, lunasiHP, hapusHP };

window.loadHPTable = loadHPTable;
window.tampilFormTambahHP = tampilFormTambahHP;
window.submitHP = submitHP;
window.lunasiHP = lunasiHP;
window.hapusHP = hapusHP;