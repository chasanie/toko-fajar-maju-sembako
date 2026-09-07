// ================================================================
// CABANG - MANAJEMEN MULTI-CABANG
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase, getData, insertData, updateData, deleteData } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast, showLoading, hideLoading, formatRupiah } from './kasir.js';

async function loadCabangTable() {
    const container = document.getElementById('cabangTableContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const data = await getData('cabang', {}, { orderBy: { column: 'nama', ascending: true } });
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#64748b;">
                    <i class="fas fa-store" style="font-size:48px;display:block;margin-bottom:12px;color:#cbd5e1;"></i>
                    <h4 style="color:#0f172a;">Belum ada cabang</h4>
                    <p style="font-size:13px;">Tambahkan cabang untuk mengelola multi-toko</p>
                    <div style="margin-top:16px;">
                        <button class="btn-tambah" onclick="window.tampilFormTambahCabang()" style="padding:8px 16px;font-size:13px;">
                            <i class="fas fa-plus"></i> Tambah Cabang
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        let html = `
            <div style="overflow-x:auto;">
                <table>
                    <thead><tr><th>ID</th><th>Nama Cabang</th><th>Alamat</th><th>Telepon</th><th>Pemilik</th><th style="text-align:center;">Status</th><th style="text-align:center;">Aksi</th></tr></thead>
                    <tbody>
        `;
        data.forEach(c => {
            html += `
                <tr>
                    <td><strong>${c.kode || c.id}</strong></td>
                    <td>${c.nama}</td>
                    <td>${c.alamat || '-'}</td>
                    <td>${c.telepon || '-'}</td>
                    <td>${c.pemilik || '-'}</td>
                    <td style="text-align:center;"><span style="background:${c.status === 'Aktif' ? '#dcfce7' : '#fee2e2'};padding:2px 12px;border-radius:20px;font-size:12px;font-weight:600;color:${c.status === 'Aktif' ? '#16a34a' : '#dc2626'};">${c.status === 'Aktif' ? '✅ Aktif' : '❌ Nonaktif'}</span></td>
                    <td style="text-align:center;">
                        <button class="btn-edit" onclick="window.editCabang('${c.id}')">Edit</button>
                        <button class="btn-hapus-table" onclick="window.hapusCabang('${c.id}')">Hapus</button>
                        <button class="btn-edit" onclick="window.lihatStatistikCabang('${c.id}')" style="background:#3b82f6;color:#fff;">Statistik</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
        loadCabangStatistik();
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

function tampilFormTambahCabang() {
    const modal = document.getElementById('modalOverlay');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Tambah Cabang';
    document.getElementById('modalBody').innerHTML = `
        <form id="formCabang" onsubmit="window.submitCabang(event)">
            <div style="display:grid;gap:12px;">
                <div><label style="font-weight:600;font-size:13px;">Nama Cabang *</label><input type="text" id="fNamaCabang" required placeholder="Contoh: Cabang Kediri" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Alamat</label><input type="text" id="fAlamatCabang" placeholder="Jl. Hasanudin No.12" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Telepon</label><input type="text" id="fTeleponCabang" placeholder="0812-2222-2222" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Pemilik</label><input type="text" id="fPemilikCabang" placeholder="Nama pemilik" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                <button type="submit" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Simpan</button>
            </div>
        </form>
    `;
}

async function submitCabang(event) {
    event.preventDefault();
    showLoading('Menyimpan cabang...');
    try {
        const session = getCurrentUser();
        const data = {
            kode: 'CBG' + String(Date.now()).slice(-4),
            nama: document.getElementById('fNamaCabang').value.trim(),
            alamat: document.getElementById('fAlamatCabang').value.trim(),
            telepon: document.getElementById('fTeleponCabang').value.trim(),
            pemilik: document.getElementById('fPemilikCabang').value.trim() || session.user.nama_lengkap || session.user.username,
            status: 'Aktif',
            dibuat: new Date().toISOString()
        };
        await insertData('cabang', data);
        hideLoading();
        window.tutupModal();
        showNotifToast('✅ Cabang berhasil ditambahkan', 'success');
        loadCabangTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function editCabang(id) {
    try {
        const data = await getData('cabang', { id });
        if (!data || data.length === 0) { showNotifToast('Cabang tidak ditemukan', 'warning'); return; }
        const c = data[0];
        const modal = document.getElementById('modalOverlay');
        modal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Edit Cabang - ' + (c.kode || c.id);
        document.getElementById('modalBody').innerHTML = `
            <form id="formCabangEdit" onsubmit="window.submitEditCabang(event, '${id}')">
                <div style="display:grid;gap:12px;">
                    <div><label style="font-weight:600;font-size:13px;">Nama Cabang *</label><input type="text" id="eNamaCabang" required value="${c.nama}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Alamat</label><input type="text" id="eAlamatCabang" value="${c.alamat || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Telepon</label><input type="text" id="eTeleponCabang" value="${c.telepon || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Pemilik</label><input type="text" id="ePemilikCabang" value="${c.pemilik || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Status</label><select id="eStatusCabang" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;"><option value="Aktif" ${c.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option value="Nonaktif" ${c.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div>
                </div>
                <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                    <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                    <button type="submit" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Update</button>
                </div>
            </form>
        `;
    } catch (e) {
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function submitEditCabang(event, id) {
    event.preventDefault();
    showLoading('Mengupdate cabang...');
    try {
        const data = {
            nama: document.getElementById('eNamaCabang').value.trim(),
            alamat: document.getElementById('eAlamatCabang').value.trim(),
            telepon: document.getElementById('eTeleponCabang').value.trim(),
            pemilik: document.getElementById('ePemilikCabang').value.trim(),
            status: document.getElementById('eStatusCabang').value
        };
        await updateData('cabang', id, data);
        hideLoading();
        window.tutupModal();
        showNotifToast('✅ Cabang berhasil diupdate', 'success');
        loadCabangTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function hapusCabang(id) {
    if (!confirm('⚠️ Yakin ingin menghapus cabang ini?\n\nJika cabang memiliki transaksi, tidak bisa dihapus.')) return;
    showLoading('Menghapus cabang...');
    try {
        await deleteData('cabang', id);
        hideLoading();
        showNotifToast('✅ Cabang berhasil dihapus', 'success');
        loadCabangTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function loadCabangStatistik() {
    const container = document.getElementById('cabangStatistikContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const session = getCurrentUser();
        const today = new Date().toISOString().split('T')[0];
        const cabangData = await getData('cabang', {}, { orderBy: { column: 'nama', ascending: true } });
        const cabangMap = {};
        cabangData.forEach(c => { cabangMap[c.id] = c.nama; });
        const { data, error } = await supabase.from('transaksi').select('cabang_id, total').eq('tanggal', today);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) {
            container.innerHTML = `<p style="color:#64748b;text-align:center;padding:20px;"><i class="fas fa-chart-simple" style="display:block;font-size:32px;margin-bottom:8px;"></i>Belum ada transaksi hari ini</p>`;
            return;
        }
        const perCabang = {};
        data.forEach(t => {
            if (!perCabang[t.cabang_id]) perCabang[t.cabang_id] = { total: 0, count: 0 };
            perCabang[t.cabang_id].total += parseFloat(t.total) || 0;
            perCabang[t.cabang_id].count += 1;
        });
        let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;">`;
        let totalOmzet = 0, totalTransaksi = 0;
        Object.keys(perCabang).forEach(id => {
            const nama = cabangMap[id] || id;
            const c = perCabang[id];
            totalOmzet += c.total;
            totalTransaksi += c.count;
            html += `<div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #3b82f6;"><h5 style="font-weight:700;color:#0f172a;font-size:14px;">${nama}</h5><p style="font-size:13px;color:#64748b;">${c.count} transaksi</p><p style="font-size:18px;font-weight:800;color:#3b82f6;">Rp ${formatRupiah(c.total)}</p></div>`;
        });
        html += `</div><div style="margin-top:16px;padding:16px;background:#0f172a;border-radius:12px;color:#fff;"><p style="font-size:14px;">Total Omzet Semua Cabang: <strong style="font-size:20px;">Rp ${formatRupiah(totalOmzet)}</strong></p><p style="font-size:13px;color:#94a3b8;">${totalTransaksi} transaksi hari ini</p></div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

async function lihatStatistikCabang(cabangId) {
    showLoading('Memuat statistik cabang...');
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.from('transaksi').select('*').eq('cabang_id', cabangId).eq('tanggal', today);
        if (error) throw new Error(error.message);
        const cabang = await getData('cabang', { id: cabangId });
        const namaCabang = cabang && cabang.length > 0 ? cabang[0].nama : 'Cabang';
        const total = data.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        const count = data.length;
        const avg = count > 0 ? total / count : 0;
        hideLoading();
        alert(`📊 Statistik ${namaCabang}\n========================\nTanggal: ${today}\nTotal Transaksi: ${count}\nTotal Omzet: Rp ${formatRupiah(total)}\nRata-rata: Rp ${formatRupiah(avg)}\n========================`);
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

export {
    loadCabangTable, tampilFormTambahCabang, submitCabang, editCabang,
    submitEditCabang, hapusCabang, loadCabangStatistik, lihatStatistikCabang
};

window.loadCabangTable = loadCabangTable;
window.tampilFormTambahCabang = tampilFormTambahCabang;
window.submitCabang = submitCabang;
window.editCabang = editCabang;
window.submitEditCabang = submitEditCabang;
window.hapusCabang = hapusCabang;
window.loadCabangStatistik = loadCabangStatistik;
window.lihatStatistikCabang = lihatStatistikCabang;