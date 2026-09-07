// ================================================================
// STOK - MANAJEMEN BARANG LENGKAP
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { getData, insertData, updateData, deleteData, callRPC } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast, showLoading, hideLoading, formatRupiah } from './kasir.js';

async function loadStokTable() {
    const container = document.getElementById('stokTableContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const session = getCurrentUser();
        const data = await getData('barang', {}, {
            cabangId: session.cabangId,
            orderBy: { column: 'nama', ascending: true }
        });
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#64748b;">
                    <i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:12px;color:#cbd5e1;"></i>
                    <h4 style="color:#0f172a;">Belum ada data barang</h4>
                    <p style="font-size:13px;">Tambahkan barang atau import dari CSV</p>
                    <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                        <button class="btn-tambah" onclick="window.tampilFormTambahBarang()" style="padding:8px 16px;font-size:13px;">
                            <i class="fas fa-plus"></i> Tambah Barang
                        </button>
                        <button class="btn-tambah" onclick="window.tampilFormImportCSV()" style="padding:8px 16px;font-size:13px;background:#f59e0b;">
                            <i class="fas fa-file-import"></i> Import CSV
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        let html = `
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Kode</th>
                            <th>Barcode</th>
                            <th>Nama</th>
                            <th>Kategori</th>
                            <th style="text-align:center;">Stok</th>
                            <th style="text-align:right;">Harga Beli</th>
                            <th style="text-align:right;">Harga Ecer</th>
                            <th style="text-align:right;">Keuntungan</th>
                            <th style="text-align:center;">%</th>
                            <th style="text-align:center;">Gambar</th>
                            <th style="text-align:center;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.forEach(p => {
            const keuntungan = (p.harga_ecer || 0) - (p.harga_beli || 0);
            const persen = p.harga_beli > 0 ? ((keuntungan / p.harga_beli) * 100).toFixed(2) : 0;
            html += `
                <tr>
                    <td><strong>${p.kode}</strong></td>
                    <td>${p.barcode || '-'}</td>
                    <td>
                        ${p.nama}
                        ${p.keterangan ? `<span style="font-size:11px;color:#94a3b8;display:block;">${p.keterangan}</span>` : ''}
                    </td>
                    <td>${p.kategori || '-'}</td>
                    <td style="text-align:center;">${p.stok} ${p.satuan_dasar || 'pcs'} ${parseInt(p.stok) <= parseInt(p.stok_minimal || 5) ? '<span style="color:#dc2626;font-size:12px;">⚠️</span>' : ''}</td>
                    <td style="text-align:right;">Rp ${formatRupiah(p.harga_beli || 0)}</td>
                    <td style="text-align:right;">Rp ${formatRupiah(p.harga_ecer)}</td>
                    <td style="text-align:right;color:${keuntungan >= 0 ? '#22c55e' : '#dc2626'};font-weight:600;">Rp ${formatRupiah(keuntungan)}</td>
                    <td style="text-align:center;color:${persen >= 0 ? '#22c55e' : '#dc2626'};font-weight:600;">${persen}%</td>
                    <td style="text-align:center;">${p.gambar_thumbnail ? `<img src="${p.gambar_thumbnail}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="window.previewGambar('${p.gambar_url}')" />` : '-'}</td>
                    <td style="text-align:center;">
                        <button class="btn-edit" onclick="window.editBarang('${p.id}')">Edit</button>
                        <button class="btn-hapus-table" onclick="window.hapusBarang('${p.id}')">Hapus</button>
                        <button class="btn-edit" onclick="window.tambahStok('${p.id}')" style="background:#22c55e;color:#fff;">+ Stok</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table></div>';
        const totalBarang = data.length;
        const totalStok = data.reduce((sum, p) => sum + (parseInt(p.stok) || 0), 0);
        const totalModal = data.reduce((sum, p) => sum + ((parseInt(p.stok) || 0) * (parseFloat(p.harga_beli) || 0)), 0);
        const totalNilaiJual = data.reduce((sum, p) => sum + ((parseInt(p.stok) || 0) * (parseFloat(p.harga_ecer) || 0)), 0);
        const potensiKeuntungan = totalNilaiJual - totalModal;
        html += `
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:20px;padding:16px;background:#f8fafc;border-radius:12px;">
                <div><p style="color:#64748b;font-size:12px;">Total Barang</p><p style="font-weight:700;font-size:18px;color:#0f172a;">${totalBarang}</p></div>
                <div><p style="color:#64748b;font-size:12px;">Total Stok</p><p style="font-weight:700;font-size:18px;color:#0f172a;">${totalStok}</p></div>
                <div><p style="color:#64748b;font-size:12px;">Total Modal</p><p style="font-weight:700;font-size:18px;color:#0f172a;">Rp ${formatRupiah(totalModal)}</p></div>
                <div><p style="color:#64748b;font-size:12px;">Nilai Jual</p><p style="font-weight:700;font-size:18px;color:#0f172a;">Rp ${formatRupiah(totalNilaiJual)}</p></div>
                <div><p style="color:#64748b;font-size:12px;">Potensi Keuntungan</p><p style="font-weight:700;font-size:18px;color:${potensiKeuntungan >= 0 ? '#22c55e' : '#dc2626'};">Rp ${formatRupiah(potensiKeuntungan)}</p></div>
            </div>
        `;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626;">Error: ' + e.message + '</p>';
    }
}

function tampilFormTambahBarang() {
    const modal = document.getElementById('modalOverlay');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Tambah Barang';
    document.getElementById('modalBody').innerHTML = `
        <form id="formBarang" onsubmit="window.submitBarang(event)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><label style="font-weight:600;font-size:13px;">Kode</label><input type="text" id="fKode" placeholder="Otomatis" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Barcode</label><div style="display:flex;gap:8px;margin-top:4px;"><input type="text" id="fBarcode" placeholder="Scan atau ketik barcode" style="flex:1;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-family:'Inter',sans-serif;" /><button type="button" onclick="window.scanBarcode()" style="padding:10px 16px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;"><i class="fas fa-qrcode"></i></button></div></div>
                <div><label style="font-weight:600;font-size:13px;">Nama *</label><input type="text" id="fNama" required placeholder="Nama barang" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Kategori</label><input type="text" id="fKategori" placeholder="Mie Instan" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Supplier</label><input type="text" id="fSupplier" placeholder="Nama supplier" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Stok *</label><input type="number" id="fStok" required value="0" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Satuan Dasar *</label><input type="text" id="fSatuan" value="pcs" placeholder="pcs" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Satuan Beli</label><input type="text" id="fSatuanBeli" value="dus" placeholder="dus" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Konversi (1 = ... pcs)</label><input type="number" id="fKonversiBeli" value="12" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Stok Minimal</label><input type="number" id="fStokMinimal" value="5" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Kadaluarsa</label><input type="date" id="fKadaluarsa" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Harga Beli *</label><input type="number" id="fHargaBeli" required placeholder="2500" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" oninput="window.hitungPreviewHarga()" /></div>
                <div><label style="font-weight:600;font-size:13px;">Harga Ecer *</label><input type="number" id="fHargaEcer" required placeholder="3500" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" oninput="window.hitungPreviewHarga()" /></div>
                <div style="background:#f0fdf4;padding:8px;border-radius:8px;grid-column:span 2;"><span style="font-size:13px;color:#16a34a;">Keuntungan: Rp <span id="previewKeuntungan">0</span> (<span id="previewPersen">0</span>%)</span></div>
                <div><label style="font-weight:600;font-size:13px;">Harga Grosir 1</label><input type="number" id="fHargaGrosir" placeholder="38000" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Min Beli Grosir 1</label><input type="number" id="fMinGrosir1" value="10" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Harga Grosir 2</label><input type="number" id="fHargaGrosir2" placeholder="36000" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div><label style="font-weight:600;font-size:13px;">Min Beli Grosir 2</label><input type="number" id="fMinGrosir2" value="50" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div style="grid-column:span 2;"><label style="font-weight:600;font-size:13px;">Gambar Produk</label><input type="file" id="fGambar" accept="image/*" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div style="grid-column:span 2;"><label style="font-weight:600;font-size:13px;">Keterangan</label><textarea id="fKeterangan" rows="2" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;resize:vertical;"></textarea></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                <button type="submit" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Simpan</button>
            </div>
        </form>
    `;
    document.getElementById('fHargaBeli').addEventListener('input', window.hitungPreviewHarga);
    document.getElementById('fHargaEcer').addEventListener('input', window.hitungPreviewHarga);
}

function hitungPreviewHarga() {
    const beli = parseFloat(document.getElementById('fHargaBeli').value) || 0;
    const ecer = parseFloat(document.getElementById('fHargaEcer').value) || 0;
    const keuntungan = ecer - beli;
    const persen = beli > 0 ? ((keuntungan / beli) * 100).toFixed(2) : 0;
    document.getElementById('previewKeuntungan').textContent = formatRupiah(keuntungan);
    document.getElementById('previewPersen').textContent = persen;
}

async function submitBarang(event) {
    event.preventDefault();
    showLoading('Menyimpan barang...');
    try {
        const session = getCurrentUser();
        const data = {
            kode: document.getElementById('fKode').value.trim() || null,
            barcode: document.getElementById('fBarcode').value.trim() || null,
            nama: document.getElementById('fNama').value.trim(),
            kategori: document.getElementById('fKategori').value.trim(),
            supplier: document.getElementById('fSupplier').value.trim(),
            stok: parseInt(document.getElementById('fStok').value) || 0,
            satuan_dasar: document.getElementById('fSatuan').value.trim() || 'pcs',
            satuan_beli: document.getElementById('fSatuanBeli').value.trim() || 'dus',
            konversi_beli: parseInt(document.getElementById('fKonversiBeli').value) || 1,
            stok_minimal: parseInt(document.getElementById('fStokMinimal').value) || 5,
            kadaluarsa: document.getElementById('fKadaluarsa').value || null,
            harga_beli: parseFloat(document.getElementById('fHargaBeli').value) || 0,
            harga_ecer: parseFloat(document.getElementById('fHargaEcer').value) || 0,
            harga_grosir: parseFloat(document.getElementById('fHargaGrosir').value) || 0,
            harga_grosir2: parseFloat(document.getElementById('fHargaGrosir2').value) || 0,
            min_grosir1: parseInt(document.getElementById('fMinGrosir1').value) || 10,
            min_grosir2: parseInt(document.getElementById('fMinGrosir2').value) || 50,
            keterangan: document.getElementById('fKeterangan').value.trim(),
            cabang_id: session.cabangId
        };
        if (!data.kode) {
            const existing = await getData('barang', {}, { cabangId: session.cabangId });
            const lastKode = existing.length > 0 ? parseInt(existing[existing.length - 1].kode.replace('BRG', '')) || 0 : 0;
            data.kode = 'BRG' + String(lastKode + 1).padStart(4, '0');
        }
        if (!data.barcode) data.barcode = data.kode;
        const fileInput = document.getElementById('fGambar');
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            data.gambar_url = await compressImage(file, 300, 300);
            data.gambar_thumbnail = await compressImage(file, 40, 40);
        }
        await insertData('barang', data);
        hideLoading();
        window.tutupModal();
        showNotifToast('✅ Barang berhasil ditambahkan', 'success');
        loadStokTable();
        await window.loadProduk(session.cabangId);
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function editBarang(id) {
    try {
        const session = getCurrentUser();
        const data = await getData('barang', { id }, { cabangId: session.cabangId });
        if (!data || data.length === 0) { showNotifToast('Barang tidak ditemukan', 'warning'); return; }
        const p = data[0];
        const modal = document.getElementById('modalOverlay');
        modal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Edit Barang - ' + p.kode;
        document.getElementById('modalBody').innerHTML = `
            <form id="formBarang" onsubmit="window.submitEditBarang(event, '${id}')">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="font-weight:600;font-size:13px;">Kode</label><input type="text" value="${p.kode}" disabled style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;background:#f1f5f9;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Barcode</label><input type="text" id="eBarcode" value="${p.barcode || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Nama *</label><input type="text" id="eNama" required value="${p.nama}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Kategori</label><input type="text" id="eKategori" value="${p.kategori || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Supplier</label><input type="text" id="eSupplier" value="${p.supplier || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Stok *</label><input type="number" id="eStok" required value="${p.stok}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Satuan Dasar</label><input type="text" id="eSatuan" value="${p.satuan_dasar || 'pcs'}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Satuan Beli</label><input type="text" id="eSatuanBeli" value="${p.satuan_beli || 'dus'}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Konversi Beli</label><input type="number" id="eKonversiBeli" value="${p.konversi_beli || 1}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Stok Minimal</label><input type="number" id="eStokMinimal" value="${p.stok_minimal || 5}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Kadaluarsa</label><input type="date" id="eKadaluarsa" value="${p.kadaluarsa || ''}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Harga Beli *</label><input type="number" id="eHargaBeli" required value="${p.harga_beli || 0}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Harga Ecer *</label><input type="number" id="eHargaEcer" required value="${p.harga_ecer || 0}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div style="background:#f0fdf4;padding:8px;border-radius:8px;grid-column:span 2;"><span style="font-size:13px;color:#16a34a;">Keuntungan: Rp <span id="previewKeuntunganEdit">0</span> (<span id="previewPersenEdit">0</span>%)</span></div>
                    <div><label style="font-weight:600;font-size:13px;">Harga Grosir 1</label><input type="number" id="eHargaGrosir" value="${p.harga_grosir || 0}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Min Grosir 1</label><input type="number" id="eMinGrosir1" value="${p.min_grosir1 || 10}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Harga Grosir 2</label><input type="number" id="eHargaGrosir2" value="${p.harga_grosir2 || 0}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div><label style="font-weight:600;font-size:13px;">Min Grosir 2</label><input type="number" id="eMinGrosir2" value="${p.min_grosir2 || 50}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                    <div style="grid-column:span 2;"><label style="font-weight:600;font-size:13px;">Keterangan</label><textarea id="eKeterangan" rows="2" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;resize:vertical;">${p.keterangan || ''}</textarea></div>
                    ${p.gambar_url ? `<div style="grid-column:span 2;"><label style="font-weight:600;font-size:13px;">Gambar Saat Ini</label><div><img src="${p.gambar_thumbnail || p.gambar_url}" style="max-width:100px;max-height:100px;border-radius:8px;" /></div></div>` : ''}
                    <div style="grid-column:span 2;"><label style="font-weight:600;font-size:13px;">Ganti Gambar</label><input type="file" id="eGambar" accept="image/*" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                </div>
                <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                    <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                    <button type="submit" style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Update</button>
                </div>
            </form>
        `;
        document.getElementById('eHargaBeli').addEventListener('input', function() {
            const beli = parseFloat(this.value) || 0;
            const ecer = parseFloat(document.getElementById('eHargaEcer').value) || 0;
            const keuntungan = ecer - beli;
            const persen = beli > 0 ? ((keuntungan / beli) * 100).toFixed(2) : 0;
            document.getElementById('previewKeuntunganEdit').textContent = formatRupiah(keuntungan);
            document.getElementById('previewPersenEdit').textContent = persen;
        });
        document.getElementById('eHargaEcer').addEventListener('input', function() {
            const ecer = parseFloat(this.value) || 0;
            const beli = parseFloat(document.getElementById('eHargaBeli').value) || 0;
            const keuntungan = ecer - beli;
            const persen = beli > 0 ? ((keuntungan / beli) * 100).toFixed(2) : 0;
            document.getElementById('previewKeuntunganEdit').textContent = formatRupiah(keuntungan);
            document.getElementById('previewPersenEdit').textContent = persen;
        });
    } catch (e) {
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function submitEditBarang(event, id) {
    event.preventDefault();
    showLoading('Mengupdate barang...');
    try {
        const data = {
            barcode: document.getElementById('eBarcode').value.trim() || null,
            nama: document.getElementById('eNama').value.trim(),
            kategori: document.getElementById('eKategori').value.trim(),
            supplier: document.getElementById('eSupplier').value.trim(),
            stok: parseInt(document.getElementById('eStok').value) || 0,
            satuan_dasar: document.getElementById('eSatuan').value.trim() || 'pcs',
            satuan_beli: document.getElementById('eSatuanBeli').value.trim() || 'dus',
            konversi_beli: parseInt(document.getElementById('eKonversiBeli').value) || 1,
            stok_minimal: parseInt(document.getElementById('eStokMinimal').value) || 5,
            kadaluarsa: document.getElementById('eKadaluarsa').value || null,
            harga_beli: parseFloat(document.getElementById('eHargaBeli').value) || 0,
            harga_ecer: parseFloat(document.getElementById('eHargaEcer').value) || 0,
            harga_grosir: parseFloat(document.getElementById('eHargaGrosir').value) || 0,
            harga_grosir2: parseFloat(document.getElementById('eHargaGrosir2').value) || 0,
            min_grosir1: parseInt(document.getElementById('eMinGrosir1').value) || 10,
            min_grosir2: parseInt(document.getElementById('eMinGrosir2').value) || 50,
            keterangan: document.getElementById('eKeterangan').value.trim()
        };
        const fileInput = document.getElementById('eGambar');
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            data.gambar_url = await compressImage(file, 300, 300);
            data.gambar_thumbnail = await compressImage(file, 40, 40);
        }
        await updateData('barang', id, data);
        hideLoading();
        window.tutupModal();
        showNotifToast('✅ Barang berhasil diupdate', 'success');
        loadStokTable();
        const session = getCurrentUser();
        await window.loadProduk(session.cabangId);
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function hapusBarang(id) {
    if (!confirm('Yakin ingin menghapus barang ini?')) return;
    showLoading('Menghapus barang...');
    try {
        await deleteData('barang', id);
        hideLoading();
        showNotifToast('✅ Barang berhasil dihapus', 'success');
        loadStokTable();
        const session = getCurrentUser();
        await window.loadProduk(session.cabangId);
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

async function tambahStok(id) {
    const qty = prompt('Masukkan jumlah stok yang ditambahkan:');
    if (qty === null) return;
    const qtyNum = parseInt(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) { showNotifToast('Jumlah tidak valid', 'warning'); return; }
    showLoading('Menambah stok...');
    try {
        const barang = await getData('barang', { id });
        if (!barang || barang.length === 0) throw new Error('Barang tidak ditemukan');
        const newStok = (parseInt(barang[0].stok) || 0) + qtyNum;
        await updateData('barang', id, { stok: newStok });
        hideLoading();
        showNotifToast(`✅ Stok berhasil ditambah (+${qtyNum})`, 'success');
        loadStokTable();
        const session = getCurrentUser();
        await window.loadProduk(session.cabangId);
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

function tampilFormImportCSV() {
    const modal = document.getElementById('modalOverlay');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Import Data Barang (CSV)';
    document.getElementById('modalBody').innerHTML = `
        <form id="formImportCSV" onsubmit="window.submitImportCSV(event)">
            <div style="display:grid;gap:12px;">
                <div style="background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #bbf7d0;">
                    <p style="font-size:13px;color:#16a34a;font-weight:600;">📋 Format CSV yang didukung:</p>
                    <p style="font-size:12px;color:#64748b;margin-top:4px;font-family:monospace;background:#f8fafc;padding:8px;border-radius:4px;white-space:pre-wrap;word-break:break-all;">
kode,barcode,nama,kategori,satuan_dasar,satuan_beli,konversi_beli,stok,stok_minimal,kadaluarsa,harga_beli,harga_ecer,harga_grosir,harga_grosir2,min_grosir1,min_grosir2,supplier,keterangan
BRG001,8991234567890,Indomie Goreng,Mie Instan,pcs,dus,12,100,5,2026-12-31,2500,3500,38000,36000,10,50,PT Indofood,Indomie rasa ayam bawang
                    </p>
                    <button type="button" onclick="window.downloadTemplateCSV()" style="margin-top:8px;padding:6px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                        <i class="fas fa-download"></i> Download Template CSV
                    </button>
                </div>
                <div><label style="font-weight:600;font-size:13px;">Pilih File CSV *</label><input type="file" id="fFileCSV" accept=".csv,.txt" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;font-family:'Inter',sans-serif;" /></div>
                <div style="background:#fef3c7;padding:12px;border-radius:8px;border:1px solid #fcd34d;"><p style="font-size:12px;color:#92400e;">⚠️ Data yang sudah ada akan dilewati. Pastikan format CSV sesuai dengan template.</p></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                <button type="button" onclick="window.tutupModal()" style="padding:10px 24px;background:#f1f5f9;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Batal</button>
                <button type="submit" style="padding:10px 24px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;"><i class="fas fa-upload"></i> Upload & Import</button>
            </div>
        </form>
    `;
}

async function submitImportCSV(event) {
    event.preventDefault();
    const fileInput = document.getElementById('fFileCSV');
    if (!fileInput.files || !fileInput.files[0]) { showNotifToast('Pilih file CSV terlebih dahulu', 'warning'); return; }
    showLoading('Mengimport data...');
    try {
        const session = getCurrentUser();
        const file = fileInput.files[0];
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('File CSV kosong atau hanya header');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            if (!row.nama) continue;
            items.push({
                kode: row.kode || null, barcode: row.barcode || null,
                nama: row.nama, kategori: row.kategori || '',
                satuan_dasar: row.satuan_dasar || 'pcs', satuan_beli: row.satuan_beli || 'dus',
                konversi_beli: parseInt(row.konversi_beli) || 1, stok: parseInt(row.stok) || 0,
                stok_minimal: parseInt(row.stok_minimal) || 5, kadaluarsa: row.kadaluarsa || null,
                harga_beli: parseFloat(row.harga_beli) || 0, harga_ecer: parseFloat(row.harga_ecer) || 0,
                harga_grosir: parseFloat(row.harga_grosir) || 0, harga_grosir2: parseFloat(row.harga_grosir2) || 0,
                min_grosir1: parseInt(row.min_grosir1) || 10, min_grosir2: parseInt(row.min_grosir2) || 50,
                supplier: row.supplier || '', keterangan: row.keterangan || ''
            });
        }
        if (items.length === 0) throw new Error('Tidak ada data valid untuk diimport');
        const result = await callRPC('bulk_insert_barang', { p_items: items, p_cabang_id: session.cabangId });
        hideLoading();
        window.tutupModal();
        alert(`✅ Import selesai!\n\nBerhasil: ${result.success} data\nGagal: ${result.failed} data`);
        if (result.success > 0) {
            showNotifToast(`✅ ${result.success} data berhasil diimport`, 'success');
            loadStokTable();
            await window.loadProduk(session.cabangId);
        } else {
            showNotifToast('❌ Tidak ada data yang berhasil diimport', 'danger');
        }
    } catch (e) {
        hideLoading();
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

function downloadTemplateCSV() {
    const headers = 'kode,barcode,nama,kategori,satuan_dasar,satuan_beli,konversi_beli,stok,stok_minimal,kadaluarsa,harga_beli,harga_ecer,harga_grosir,harga_grosir2,min_grosir1,min_grosir2,supplier,keterangan\n';
    const example = 'BRG001,8991234567890,Indomie Goreng,Mie Instan,pcs,dus,12,100,5,2026-12-31,2500,3500,38000,36000,10,50,PT Indofood,Indomie rasa ayam bawang\n';
    const csv = headers + example + example.replace('BRG001', 'BRG002').replace('8991234567890', '8991234567891').replace('Indomie Goreng', 'Telur Ayam');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_barang.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportStokExcel() {
    const session = getCurrentUser();
    showNotifToast('Menyiapkan file Excel...', 'info');
    try {
        const data = await getData('barang', {}, { cabangId: session.cabangId, orderBy: { column: 'nama', ascending: true } });
        const headers = ['kode','barcode','nama','kategori','satuan_dasar','satuan_beli','konversi_beli','stok','stok_minimal','kadaluarsa','harga_beli','harga_ecer','keuntungan','persen_keuntungan','harga_grosir','harga_grosir2','min_grosir1','min_grosir2','supplier','keterangan'];
        let csv = headers.join(',') + '\n';
        data.forEach(b => {
            const keuntungan = (b.harga_ecer || 0) - (b.harga_beli || 0);
            const persen = b.harga_beli > 0 ? ((keuntungan / b.harga_beli) * 100).toFixed(2) : 0;
            const row = [
                b.kode, `"${b.barcode || ''}"`, `"${b.nama}"`, b.kategori || '', b.satuan_dasar || 'pcs',
                b.satuan_beli || 'dus', b.konversi_beli || 1, b.stok, b.stok_minimal || 5, b.kadaluarsa || '',
                b.harga_beli || 0, b.harga_ecer || 0, keuntungan, persen,
                b.harga_grosir || 0, b.harga_grosir2 || 0, b.min_grosir1 || 10, b.min_grosir2 || 50,
                b.supplier || '', `"${b.keterangan || ''}"`
            ];
            csv += row.join(',') + '\n';
        });
        const totalBarang = data.length;
        const totalStok = data.reduce((sum, p) => sum + (parseInt(p.stok) || 0), 0);
        const totalModal = data.reduce((sum, p) => sum + ((parseInt(p.stok) || 0) * (parseFloat(p.harga_beli) || 0)), 0);
        const totalNilaiJual = data.reduce((sum, p) => sum + ((parseInt(p.stok) || 0) * (parseFloat(p.harga_ecer) || 0)), 0);
        csv += `\n\nRINGKASAN\nTotal Barang,${totalBarang}\nTotal Stok,${totalStok}\nTotal Modal,${totalModal}\nTotal Nilai Jual,${totalNilaiJual}\nPotensi Keuntungan,${totalNilaiJual - totalModal}\nTanggal Export,${new Date().toLocaleString()}\nCabang,${session.cabangId}\n`;
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Stok_Lengkap_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotifToast('✅ Export berhasil!', 'success');
    } catch (e) {
        showNotifToast('❌ Error export: ' + e.message, 'danger');
    }
}

function compressImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function previewGambar(url) {
    if (!url) return;
    const modal = document.getElementById('modalOverlay');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Preview Gambar';
    document.getElementById('modalBody').innerHTML = `
        <div style="text-align:center;">
            <img src="${url}" style="max-width:100%;max-height:70vh;border-radius:8px;" />
            <div style="margin-top:12px;">
                <button onclick="window.tutupModal()" style="padding:8px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;">Tutup</button>
            </div>
        </div>
    `;
}

export {
    loadStokTable, tampilFormTambahBarang, submitBarang, editBarang, submitEditBarang,
    hapusBarang, tambahStok, tampilFormImportCSV, submitImportCSV, downloadTemplateCSV,
    exportStokExcel, compressImage, previewGambar
};

window.loadStokTable = loadStokTable;
window.tampilFormTambahBarang = tampilFormTambahBarang;
window.submitBarang = submitBarang;
window.editBarang = editBarang;
window.submitEditBarang = submitEditBarang;
window.hapusBarang = hapusBarang;
window.tambahStok = tambahStok;
window.tampilFormImportCSV = tampilFormImportCSV;
window.submitImportCSV = submitImportCSV;
window.downloadTemplateCSV = downloadTemplateCSV;
window.exportStokExcel = exportStokExcel;
window.previewGambar = previewGambar;