// ================================================================
// KASIR - PROSES TRANSAKSI DAN KERANJANG
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { getData, insertData, updateData, callRPC, subscribeRealtime, unsubscribeRealtime } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { showNotifToast } from './notifikasi.js';

let keranjang = [];
let produkData = [];
let realtimeChannel = null;
let html5QrCode = null;
let isScannerRunning = false;
let scanCallback = null;

function formatRupiah(angka) {
    if (!angka || isNaN(angka)) return '0';
    return new Intl.NumberFormat('id-ID').format(Math.round(angka));
}

function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'Memproses...';
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

async function loadProduk(cabangId) {
    try {
        produkData = await getData('barang', {}, {
            cabangId: cabangId,
            select: 'id, kode, barcode, nama, kategori, satuan_dasar, isi_per_dus, harga_ecer, harga_grosir, stok, stok_minimal, kadaluarsa, supplier, gambar_thumbnail, harga_beli, harga_grosir2, min_grosir1, min_grosir2, keterangan',
            orderBy: { column: 'nama', ascending: true }
        });
        if (realtimeChannel) {
            unsubscribeRealtime(realtimeChannel);
        }
        realtimeChannel = subscribeRealtime('barang', cabangId, (payload) => {
            if (payload.eventType === 'UPDATE') {
                const index = produkData.findIndex(p => p.id === payload.new.id);
                if (index !== -1) {
                    produkData[index] = payload.new;
                    renderProduk(produkData);
                }
            }
        });
        return produkData;
    } catch (e) {
        console.error('Error load produk:', e);
        return [];
    }
}

function renderProduk(data, searchKeyword = '') {
    const grid = document.getElementById('produkGrid');
    if (!grid) return;
    let filtered = data || produkData;
    if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        filtered = filtered.filter(p => 
            p.nama.toLowerCase().includes(kw) || 
            p.kode.toLowerCase().includes(kw) ||
            (p.barcode && p.barcode.toLowerCase().includes(kw))
        );
    }
    if (!filtered || filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <i class="fas fa-box-open"></i>
                <h4>Tidak ada produk</h4>
                <p style="font-size:13px;">Tambahkan produk melalui menu Stok</p>
            </div>
        `;
        return;
    }
    grid.innerHTML = filtered.map(p => `
        <div class="produk-card" onclick="window.tambahKeKeranjang('${p.kode}')" title="${p.nama}">
            ${p.gambar_thumbnail ? `<img src="${p.gambar_thumbnail}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />` : ''}
            <div class="nama">${p.nama}</div>
            <div class="kode">${p.kode}</div>
            <div class="harga">Rp ${formatRupiah(p.harga_ecer)} <span class="satuan">/${p.satuan_dasar || 'pcs'}</span></div>
            <div class="stok">Stok: <span class="${parseInt(p.stok) < 10 ? 'warning' : ''}">${p.stok}</span> ${parseInt(p.stok) < 10 ? '⚠️' : ''}</div>
        </div>
    `).join('');
}

function filterProduk(keyword) {
    renderProduk(produkData, keyword);
}

function tambahKeKeranjang(kode) {
    const produk = produkData.find(p => p.kode === kode || p.barcode === kode);
    if (!produk) { showNotifToast('Produk tidak ditemukan', 'warning'); return; }
    if (parseInt(produk.stok) <= 0) { showNotifToast('Stok habis!', 'danger'); return; }
    const existing = keranjang.find(item => item.kode === produk.kode);
    if (existing) {
        if (existing.qty + 1 > parseInt(produk.stok)) { showNotifToast('Stok tidak mencukupi!', 'warning'); return; }
        existing.qty += 1;
        existing.subtotal = existing.qty * existing.hargaPakai;
    } else {
        keranjang.push({
            id: produk.id, kode: produk.kode, nama: produk.nama, qty: 1,
            hargaEcer: parseFloat(produk.harga_ecer) || 0,
            hargaGrosir: parseFloat(produk.harga_grosir) || 0,
            satuanDasar: produk.satuan_dasar || 'pcs',
            isiPerDus: parseInt(produk.isi_per_dus) || 1,
            hargaPakai: parseFloat(produk.harga_ecer) || 0,
            subtotal: parseFloat(produk.harga_ecer) || 0,
            gambar: produk.gambar_thumbnail || null
        });
    }
    updateKeranjangUI();
}

function ubahSatuanKeranjang(index, value) {
    const item = keranjang[index];
    if (!item) return;
    item.hargaPakai = value === 'grosir' ? (item.hargaGrosir || item.hargaEcer) : item.hargaEcer;
    item.subtotal = item.qty * item.hargaPakai;
    updateKeranjangUI();
}

function ubahQtyKeranjang(index, delta) {
    const item = keranjang[index];
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) { hapusItemKeranjang(index); return; }
    const produk = produkData.find(p => p.kode === item.kode);
    if (produk && newQty > parseInt(produk.stok)) { showNotifToast('Stok tidak mencukupi!', 'warning'); return; }
    item.qty = newQty;
    item.subtotal = item.qty * item.hargaPakai;
    updateKeranjangUI();
}

function hapusItemKeranjang(index) {
    keranjang.splice(index, 1);
    updateKeranjangUI();
}

function batalTransaksi() {
    if (keranjang.length === 0) return;
    if (confirm('Batalkan transaksi? Semua item akan dihapus.')) { keranjang = []; updateKeranjangUI(); }
}

function updateKeranjangUI() {
    const container = document.getElementById('daftarKeranjang');
    const totalItem = keranjang.reduce((sum, i) => sum + i.qty, 0);
    const totalBayar = keranjang.reduce((sum, i) => sum + i.subtotal, 0);
    document.getElementById('jumlahItem').textContent = totalItem + ' item';
    document.getElementById('totalItem').textContent = totalItem;
    document.getElementById('totalBayar').textContent = 'Rp ' + formatRupiah(totalBayar);
    if (keranjang.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart" style="font-size:32px;"></i>
                <h4>Keranjang kosong</h4>
                <p style="font-size:13px;">Klik produk untuk menambahkan</p>
            </div>
        `;
        document.getElementById('btnBayar').disabled = true;
        return;
    }
    document.getElementById('btnBayar').disabled = false;
    container.innerHTML = keranjang.map((item, index) => `
        <div class="item-keranjang">
            ${item.gambar ? `<img src="${item.gambar}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;" />` : ''}
            <div class="info">
                <div class="nama-item">${item.nama}</div>
                <div class="detail-item">
                    <span class="satuan-badge">${item.satuanDasar}</span> @ Rp ${formatRupiah(item.hargaPakai)}
                    <select onchange="window.ubahSatuanKeranjang(${index}, this.value)" style="margin-left:6px;padding:2px 4px;border-radius:4px;border:1px solid #e2e8f0;font-size:12px;">
                        <option value="ecer" ${item.hargaPakai === item.hargaEcer ? 'selected' : ''}>Ecer</option>
                        <option value="grosir" ${item.hargaPakai === item.hargaGrosir ? 'selected' : ''}>Grosir</option>
                    </select>
                </div>
            </div>
            <div class="qty-control">
                <button onclick="window.ubahQtyKeranjang(${index}, -1)">−</button>
                <span class="qty">${item.qty}</span>
                <button onclick="window.ubahQtyKeranjang(${index}, 1)">+</button>
            </div>
            <div class="subtotal">Rp ${formatRupiah(item.subtotal)}</div>
            <button class="btn-hapus" onclick="window.hapusItemKeranjang(${index})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

async function prosesTransaksi() {
    if (keranjang.length === 0) { showNotifToast('Keranjang kosong!', 'warning'); return; }
    if (window.isProcessing) return;
    const total = keranjang.reduce((sum, i) => sum + i.subtotal, 0);
    const metode = document.getElementById('metodeBayar').value;
    if (!confirm(`Bayar Rp ${formatRupiah(total)} dengan ${metode}?`)) return;
    window.isProcessing = true;
    showLoading('Memproses transaksi...');
    const session = getCurrentUser();
    const items = keranjang.map(item => ({ kode: item.kode, qty: item.qty, satuan: item.hargaPakai === item.hargaGrosir ? 'grosir' : 'ecer' }));
    try {
        const result = await callRPC('proses_transaksi', {
            p_items: items, p_cabang_id: session.cabangId,
            p_kasir: session.user.username, p_pelanggan: 'Umum', p_metode_bayar: metode
        });
        hideLoading(); window.isProcessing = false;
        if (result && result.status === 'success') {
            showNotifToast(`✅ Transaksi ${result.id_transaksi} berhasil! Total: Rp ${formatRupiah(result.total)}`, 'success');
            document.getElementById('nomorTransaksi').textContent = result.id_transaksi;
            keranjang = []; updateKeranjangUI();
            await loadProduk(session.cabangId);
        } else {
            showNotifToast('❌ Transaksi gagal', 'danger');
        }
    } catch (e) {
        hideLoading(); window.isProcessing = false;
        showNotifToast('❌ Error: ' + e.message, 'danger');
    }
}

function cetakStruk() {
    if (keranjang.length === 0) { showNotifToast('Keranjang kosong', 'warning'); return; }
    const total = keranjang.reduce((sum, i) => sum + i.subtotal, 0);
    const namaToko = document.getElementById('namaToko').textContent || 'TOKO SEMBAKO';
    const session = getCurrentUser();
    let struk = '=== ' + namaToko + ' ===\n';
    struk += new Date().toLocaleString() + '\n';
    struk += 'Kasir: ' + (session.user.nama_lengkap || session.user.username) + '\n';
    struk += '========================\n';
    keranjang.forEach(item => { struk += `${item.nama} x${item.qty} = Rp ${formatRupiah(item.subtotal)}\n`; });
    struk += '========================\nTOTAL: Rp ' + formatRupiah(total) + '\n========================\nTerima kasih!';
    const win = window.open('', '_blank', 'width=400,height=600');
    if (win) {
        win.document.write('<pre style="font-family:monospace;font-size:14px;padding:20px;">' + struk + '</pre>');
        win.document.write('<button onclick="window.print()" style="padding:10px 20px;margin:10px;cursor:pointer;">🖨️ Cetak</button>');
        win.document.close();
    } else { alert('Struk:\n\n' + struk); }
}

async function cetakStrukBluetooth() {
    if (keranjang.length === 0) { showNotifToast('Keranjang kosong', 'warning'); return; }
    const total = keranjang.reduce((sum, i) => sum + i.subtotal, 0);
    const namaToko = document.getElementById('namaToko').textContent || 'TOKO SEMBAKO';
    const session = getCurrentUser();
    let struk = '=== ' + namaToko + ' ===\n';
    struk += new Date().toLocaleString() + '\n';
    struk += 'Kasir: ' + (session.user.nama_lengkap || session.user.username) + '\n';
    struk += '========================\n';
    keranjang.forEach(item => { struk += `${item.nama} x${item.qty} = Rp ${formatRupiah(item.subtotal)}\n`; });
    struk += '========================\nTOTAL: Rp ' + formatRupiah(total) + '\n========================\nTerima kasih!';
    showNotifToast('✅ Struk siap dicetak! Silakan konekkan printer Bluetooth.', 'success');
    console.log('Struk untuk Bluetooth:\n', struk);
}

function scanBarcode() {
    const kode = prompt('Masukkan kode barcode (contoh: BRG001 atau 8991234567890):');
    if (kode) {
        const produk = produkData.find(p => p.kode === kode || p.barcode === kode);
        if (produk) {
            tambahKeKeranjang(produk.kode);
        } else {
            showNotifToast('❌ Produk tidak ditemukan!', 'warning');
            if (confirm(`Produk dengan barcode "${kode}" tidak ditemukan. Buat produk baru?`)) {
                window.tampilFormTambahBarangWithBarcode(kode);
            }
        }
    }
}

export {
    keranjang, produkData, loadProduk, renderProduk, filterProduk,
    tambahKeKeranjang, ubahSatuanKeranjang, ubahQtyKeranjang,
    hapusItemKeranjang, batalTransaksi, updateKeranjangUI,
    prosesTransaksi, cetakStruk, cetakStrukBluetooth,
    formatRupiah, showLoading, hideLoading, scanBarcode
};

window.tambahKeKeranjang = tambahKeKeranjang;
window.ubahSatuanKeranjang = ubahSatuanKeranjang;
window.ubahQtyKeranjang = ubahQtyKeranjang;
window.hapusItemKeranjang = hapusItemKeranjang;
window.prosesTransaksi = prosesTransaksi;
window.batalTransaksi = batalTransaksi;
window.cetakStruk = cetakStruk;
window.cetakStrukBluetooth = cetakStrukBluetooth;
window.scanBarcode = scanBarcode;
window.formatRupiah = formatRupiah;
window.filterProduk = filterProduk;
window.isProcessing = false;
window.keranjang = keranjang;
window.produkData = produkData;