// ================================================================
// PENGGUNA - MANAJEMEN USER
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase, getData, insertData, updateData, deleteData } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast, showLoading, hideLoading, formatRupiah } from './kasir.js';

async function loadUserTable() {
    const container = document.getElementById('userTableContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const session = getCurrentUser();
        const data = await getData('users', {}, { orderBy: { column: 'username', ascending: true } });
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#64748b;">
                    <i class="fas fa-users" style="font-size:48px;display:block;margin-bottom:12px;color:#cbd5e1;"></i>
                    <h4 style="color:#0f172a;">Belum ada pengguna</h4>
                    <p style="font-size:13px;">Tambahkan pengguna untuk mengakses sistem</p>
                    <div style="margin-top:16px;">
                        <button class="btn-tambah" onclick="window.tampilFormTambahUser()" style="padding:8px 16px;font-size:13px;">
                            <i class="fas fa-plus"></i> Tambah User
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        const cabangData = await getData('cabang', {}, {});
        const cabangMap = {};
        cabangData.forEach(c => { cabangMap[c.id] = c.nama; });
        let html = `
            <div style="overflow-x:auto;">
                <table>
                    <thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Cabang</th><th>Shift</th><th style="text-align:center;">Status</th><th style="text-align:center;">Aksi</th></tr></thead>
                    <tbody>
        `;
        data.forEach(u => {
            const cabangNama = cabangMap[u.cabang_id] || u.cabang_id || '-';
            html += `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.nama_lengkap || '-'}</td>
                    <td><span style="background:${u.role === 'admin' ? '#dbeafe' : '#f1f5f9'};padding:2px 12px;border-radius:12px;font-size:12px;font-weight:600;color:${u.role === 'admin' ? '#2563eb' : '#475569'};">${u.role === 'admin' ? '👑 Admin' : '👤 Kasir'}</span></td>
                    <td>${cabangNama}</td>
                    <td>${u.shift || '-'}</td>
                    <td style="text-align:center;"><span style="background:${u.aktif ? '#dcfce7' : '#fee2e2'};padding:2px 12px;border-radius:20px;font-size:12px;font-weight:600;color:${u.aktif ? '#16a34a' : '#dc2626'};">${u.aktif ? '✅ Aktif' : '❌ Nonaktif'}</span></td>
                    <td style="text-align:center;">
                        <button class="btn-edit" onclick="window.editUser('${u.username}')">Edit</button>
                        ${u.username !== session.user.username ? `<button class="btn-hapus-table" onclick="window.hapusUser('${u.username}')">Hapus</button>` : ''}
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

function tampilFormTambahUser() {
    showLoading('Memuat data cabang...');
    getData('cabang', {}, { orderBy: { column: 'nama', ascending: true } })
        .then(cabangList => {
            hideLoading();
            const modal = document.getElementById('modalOverlay');
            modal.style.display = 'flex';
            document.getElementById('modalTitle').textContent = 'Tambah Pengguna';
            let cabangOptions = '<option value="">Pilih Cabang</option>';
            cabangList.forEach(c => { cabangOptions += `<option value="${c.id}">${c.nama}</option>`; });
            document.getElementById('modalBody').innerHTML = `
                <form id="formUser" onsubmit="window.submitUser(event)">
                    <div style="display:grid;gap:12px;">
                        <div><label style="font-weight:600;font-size:13px;">Username *</label><input type="text" id="fUsername" required placeholder="kasir1" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                        <div><label style="font-weight:600;font-size:13px;">Email *</label><input type="email" id="fEmail" required placeholder="kasir1@tokofajar.com" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                        <div><label style="font-weight:600;font-size:13px;">Password *</label><input type="password" id="fPassword" required placeholder="Minimal 6 karakter" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                        <div><label style="font-weight:600;font-size:13px;">Nama Lengkap</label><input type="text" id="fNamaLengkap" placeholder="Andi Wijaya" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                        <div><label style="font-weight:600;font-size:13px;">Role *</label><select id="fRole" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;"><option value="kasir">Kasir</option><option value="admin">Admin</option></select></div>
                        <div><label style="font-weight:600;font-size:13px;">Cabang *</label><select id="fCabangUser" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;">${cabangOptions}</select></div>
                        <div><label style="font-weight:600;font-size:13px;">Shift</label><select id="fShift" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;"><option value="">-</option><option value="Pagi">Pagi</option><option value="Siang">Siang</option><option value="Malam">Malam</option></select></div>
                    </div>
                    <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                        <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                        <button type="submit" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Simpan</button>
                    </div>
                </form>
            `;
        })
        .catch(err => { hideLoading(); showNotifToast('❌ Error load cabang: ' + err.message, 'danger'); });
}

async function submitUser(event) {
    event.preventDefault();
    showLoading('Menyimpan user...');
    try {
        const data = {
            username: document.getElementById('fUsername').value.trim(),
            email: document.getElementById('fEmail').value.trim(),
            password: document.getElementById('fPassword').value.trim(),
            nama_lengkap: document.getElementById('fNamaLengkap').value.trim(),
            role: document.getElementById('fRole').value,
            cabang_id: document.getElementById('fCabangUser').value,
            shift: document.getElementById('fShift').value
        };
        if (data.password.length < 6) throw new Error('Password minimal 6 karakter');
        if (!data.cabang_id) throw new Error('Pilih cabang terlebih dahulu');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: data.email, password: data.password, email_confirm: true
        });
        if (authError) throw new Error(authError.message);
        const userData = {
            id: authData.user.id, username: data.username, nama_lengkap: data.nama_lengkap,
            role: data.role, cabang_id: data.cabang_id, shift: data.shift || '', aktif: true
        };
        await insertData('users', userData);
        hideLoading();
        window.tutupModal();
        showNotifToast('✅ User berhasil ditambahkan', 'success');
        loadUserTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function editUser(username) {
    const action = prompt(`Edit user: ${username}\n\nPilih aksi:\n1 - Reset Password\n2 - Toggle Status (Aktif/Nonaktif)\n3 - Batal\n\nMasukkan angka:`);
    if (action === null || action === '3') return;
    if (action === '1') {
        const newPass = prompt('Masukkan password baru (minimal 6 karakter):');
        if (newPass === null) return;
        if (newPass.length < 6) { showNotifToast('Password minimal 6 karakter', 'warning'); return; }
        showLoading('Merubah password...');
        try {
            const users = await getData('users', { username });
            if (!users || users.length === 0) throw new Error('User tidak ditemukan');
            const { error } = await supabase.auth.admin.updateUserById(users[0].id, { password: newPass });
            if (error) throw new Error(error.message);
            hideLoading();
            showNotifToast('✅ Password berhasil direset', 'success');
            loadUserTable();
        } catch (e) {
            hideLoading();
            showNotifToast('❌ Error: ' + e.message, 'danger');
        }
    } else if (action === '2') {
        showLoading('Mengupdate status...');
        try {
            const users = await getData('users', { username });
            if (!users || users.length === 0) throw new Error('User tidak ditemukan');
            const newStatus = !users[0].aktif;
            await updateData('users', users[0].id, { aktif: newStatus });
            hideLoading();
            showNotifToast(`✅ Status user berubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`, 'success');
            loadUserTable();
        } catch (e) {
            hideLoading();
            showNotifToast('❌ Error: ' + e.message, 'danger');
        }
    } else {
        showNotifToast('Pilihan tidak valid', 'warning');
    }
}

async function hapusUser(username) {
    if (!confirm(`⚠️ Yakin ingin menghapus user "${username}"?\n\nData tidak bisa dikembalikan.`)) return;
    showLoading('Menghapus user...');
    try {
        const users = await getData('users', { username });
        if (!users || users.length === 0) throw new Error('User tidak ditemukan');
        const { error } = await supabase.auth.admin.deleteUser(users[0].id);
        if (error) throw new Error(error.message);
        await deleteData('users', users[0].id);
        hideLoading();
        showNotifToast('✅ User berhasil dihapus', 'success');
        loadUserTable();
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

export { loadUserTable, tampilFormTambahUser, submitUser, editUser, hapusUser };

window.loadUserTable = loadUserTable;
window.tampilFormTambahUser = tampilFormTambahUser;
window.submitUser = submitUser;
window.editUser = editUser;
window.hapusUser = hapusUser;