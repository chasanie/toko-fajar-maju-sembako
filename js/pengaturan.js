// ================================================================
// PENGATURAN - KONFIGURASI TOKO & BACKUP
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase, getData, insertData, updateData, deleteData, callRPC } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast, showLoading, hideLoading, formatRupiah } from './kasir.js';

async function loadPengaturanForm() {
    const container = document.getElementById('pengaturanContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const session = getCurrentUser();
        const data = await getData('pengaturan', { cabang_id: session.cabangId });
        const settings = {};
        data.forEach(row => { settings[row.key] = row.value; });
        let html = `
            <form id="formPengaturan" onsubmit="window.submitPengaturan(event)" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div><label style="font-weight:600;font-size:13px;">Nama Toko</label><input type="text" id="pNamaToko" value="${settings.nama_toko || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Logo URL</label><input type="text" id="pLogoUrl" value="${settings.logo_url || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Alamat</label><input type="text" id="pAlamat" value="${settings.alamat || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Telepon</label><input type="text" id="pTelepon" value="${settings.telepon || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Pajak (%)</label><input type="number" id="pPajak" value="${settings.pajak || 0}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Diskon Maks Kasir (%)</label><input type="number" id="pDiskonMaks" value="${settings.diskon_maks_kasir || 5}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div style="grid-column:span 2;"><button type="submit" style="padding:12px 32px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-weight:600;font-size:16px;cursor:pointer;width:100%;"><i class="fas fa-save"></i> Simpan Pengaturan</button></div>
            </form>
            <hr style="margin:24px 0;border-color:#f1f5f9;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div style="background:#f8fafc;padding:16px;border-radius:12px;">
                    <h4 style="margin-bottom:8px;">💾 Backup Data</h4>
                    <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Buat salinan cadangan semua data ke Google Drive.</p>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button onclick="window.buatBackup()" style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;"><i class="fas fa-save"></i> Backup Sekarang</button>
                        <button onclick="window.restoreBackup()" style="padding:10px 20px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;"><i class="fas fa-undo"></i> Restore Backup</button>
                    </div>
                </div>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;">
                    <h4 style="margin-bottom:8px;">⏰ Backup Otomatis</h4>
                    <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Backup otomatis setiap hari jam 01:00. Data disimpan di folder "Backup POS Sembako".</p>
                    <button onclick="window.setupAutomation()" style="padding:10px 20px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;"><i class="fas fa-play"></i> Setup Otomatis</button>
                </div>
            </div>
            <hr style="margin:24px 0;border-color:#f1f5f9;">
            <div><h4 style="margin-bottom:12px;">📋 Riwayat Backup</h4><div id="backupHistoryContainer"><div class="loader"></div></div></div>
        `;
        container.innerHTML = html;
        loadBackupHistory();
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

async function submitPengaturan(event) {
    event.preventDefault();
    showLoading('Menyimpan pengaturan...');
    try {
        const session = getCurrentUser();
        const settings = [
            { key: 'nama_toko', value: document.getElementById('pNamaToko').value.trim() },
            { key: 'logo_url', value: document.getElementById('pLogoUrl').value.trim() },
            { key: 'alamat', value: document.getElementById('pAlamat').value.trim() },
            { key: 'telepon', value: document.getElementById('pTelepon').value.trim() },
            { key: 'pajak', value: document.getElementById('pPajak').value },
            { key: 'diskon_maks_kasir', value: document.getElementById('pDiskonMaks').value }
        ];
        for (const setting of settings) {
            const existing = await getData('pengaturan', { key: setting.key, cabang_id: session.cabangId });
            if (existing && existing.length > 0) {
                await updateData('pengaturan', existing[0].id, { value: setting.value });
            } else {
                await insertData('pengaturan', { key: setting.key, value: setting.value, cabang_id: session.cabangId });
            }
        }
        hideLoading();
        showNotifToast('✅ Pengaturan berhasil disimpan!', 'success');
        loadSettings();
        loadPengaturanForm();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function loadSettings() {
    try {
        const session = getCurrentUser();
        const data = await getData('pengaturan', { cabang_id: session.cabangId });
        const settings = {};
        data.forEach(row => { settings[row.key] = row.value; });
        if (settings.nama_toko) {
            document.getElementById('namaToko').textContent = settings.nama_toko;
            document.querySelector('.toko-info .nama-toko').textContent = settings.nama_toko;
        }
        if (settings.logo_url) {
            const logo = document.querySelector('.sidebar-header .logo');
            logo.innerHTML = `<img src="${settings.logo_url}" alt="Logo" />`;
        }
    } catch (e) {}
}

async function buatBackup() {
    if (!confirm('Buat backup sekarang? Proses ini akan menduplikasi seluruh data.')) return;
    showLoading('Membuat backup...');
    try {
        const session = getCurrentUser();
        const db = supabase;
        const tables = ['barang', 'transaksi', 'users', 'cabang', 'hutang_piutang', 'pengaturan', 'notifikasi'];
        const backupData = {};
        for (const table of tables) {
            const { data, error } = await db.from(table).select('*');
            if (error) throw new Error(error.message);
            backupData[table] = data;
        }
        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hideLoading();
        showNotifToast('✅ Backup berhasil dibuat!', 'success');
        await supabase.from('log_aktivitas').insert({
            username: session.user.username,
            aktivitas: 'BACKUP_MANUAL',
            detail: 'Backup manual berhasil dibuat'
        });
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error backup: ' + e.message, 'danger');
    }
}

async function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm('⚠️ PERINGATAN: Restore akan menimpa semua data saat ini!\n\nLanjutkan?')) return;
        showLoading('Merestore backup...');
        try {
            const session = getCurrentUser();
            const text = await file.text();
            const backupData = JSON.parse(text);
            const db = supabase;
            const tables = ['cabang', 'users', 'barang', 'transaksi', 'hutang_piutang', 'pengaturan', 'notifikasi'];
            let restored = 0;
            for (const table of tables) {
                if (!backupData[table] || backupData[table].length === 0) continue;
                await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                const { error } = await db.from(table).insert(backupData[table]);
                if (error) { console.warn(`Gagal insert data ${table}:`, error); continue; }
                restored++;
            }
            hideLoading();
            showNotifToast(`✅ Restore berhasil! ${restored} tabel direstore.`, 'success');
            await db.from('log_aktivitas').insert({
                username: session.user.username,
                aktivitas: 'RESTORE_BACKUP',
                detail: `Restore dari file: ${file.name}`
            });
            setTimeout(() => { location.reload(); }, 2000);
        } catch (e) {
            hideLoading();
            showNotifToast('❌ Error restore: ' + e.message, 'danger');
        }
    };
    input.click();
}

async function loadBackupHistory() {
    const container = document.getElementById('backupHistoryContainer');
    if (!container) return;
    try {
        const session = getCurrentUser();
        const { data, error } = await supabase.from('log_aktivitas').select('*').eq('username', session.user.username).in('aktivitas', ['BACKUP_MANUAL', 'RESTORE_BACKUP']).order('waktu', { ascending: false }).limit(20);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) {
            container.innerHTML = `<p style="color:#94a3b8;text-align:center;padding:20px;"><i class="fas fa-history" style="display:block;font-size:24px;margin-bottom:8px;"></i>Belum ada riwayat backup</p>`;
            return;
        }
        let html = `<div style="overflow-x:auto;"><table><thead><tr><th>Waktu</th><th>Aktivitas</th><th>Detail</th></tr></thead><tbody>`;
        data.forEach(log => {
            const icon = log.aktivitas === 'BACKUP_MANUAL' ? '💾' : '🔄';
            const color = log.aktivitas === 'BACKUP_MANUAL' ? '#22c55e' : '#f59e0b';
            html += `<tr><td>${new Date(log.waktu).toLocaleString()}</td><td><span style="background:${color}20;padding:2px 12px;border-radius:12px;font-size:12px;font-weight:600;color:${color};">${icon} ${log.aktivitas === 'BACKUP_MANUAL' ? 'Backup' : 'Restore'}</span></td><td>${log.detail || '-'}</td></tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

async function setupAutomation() {
    if (!confirm('Setup trigger otomatis untuk:\n\n• Backup setiap hari jam 01:00\n• Notifikasi setiap 6 jam\n\nLanjutkan?')) return;
    showLoading('Setup trigger otomatis...');
    try {
        const session = getCurrentUser();
        const result = await callRPC('setup_automation_triggers', { p_user_id: session.user.id });
        hideLoading();
        if (result && result.success) {
            showNotifToast('✅ Trigger otomatis berhasil diatur!', 'success');
            alert('Trigger otomatis berhasil diatur!\n\n• Backup setiap hari jam 01:00\n• Notifikasi setiap 6 jam\n\nData backup disimpan di folder "Backup POS Sembako"');
        } else {
            showNotifToast('❌ Setup gagal: ' + (result?.message || 'Unknown error'), 'danger');
        }
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

export {
    loadPengaturanForm, submitPengaturan, loadSettings,
    buatBackup, restoreBackup, loadBackupHistory, setupAutomation
};

window.loadPengaturanForm = loadPengaturanForm;
window.submitPengaturan = submitPengaturan;
window.loadSettings = loadSettings;
window.buatBackup = buatBackup;
window.restoreBackup = restoreBackup;
window.loadBackupHistory = loadBackupHistory;
window.setupAutomation = setupAutomation;