// ================================================================
// APP - INISIALISASI APLIKASI
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase, getData, insertData, updateData, deleteData, callRPC, subscribeRealtime, unsubscribeRealtime } from './supabase-client.js';
import { doLogin, doLogout, getCurrentUser, isAuthenticated, checkSession, registerUser, resetPassword } from './auth.js';
import { 
    loadProduk, renderProduk, tambahKeKeranjang, ubahSatuanKeranjang, ubahQtyKeranjang, 
    hapusItemKeranjang, batalTransaksi, updateKeranjangUI, prosesTransaksi, cetakStruk, cetakStrukBluetooth,
    scanBarcode, scanBarcodeForForm, openBarcodeScanner, startScanner, stopScanner, submitManualBarcode,
    formatRupiah, showLoading, hideLoading, filterProduk 
} from './kasir.js';
import { 
    loadStokTable, tampilFormTambahBarang, submitBarang, editBarang, submitEditBarang, 
    hapusBarang, tambahStok, tampilFormImportCSV, submitImportCSV, downloadTemplateCSV, 
    exportStokExcel, compressImage, previewGambar, hitungPreviewHarga, hitungPreviewHargaEdit,
    tampilFormTambahBarangWithBarcode
} from './stok.js';
import { loadLaporan, exportExcel } from './laporan.js';
import { loadDashboard, drawGrafik } from './dashboard.js';
import { initNotifikasi, loadNotifikasi, showNotifToast, klikNotifikasi, toggleNotifDropdown, semuaDibaca, updateNotifikasiUI } from './notifikasi.js';
import { loadCabangTable, tampilFormTambahCabang, submitCabang, editCabang, submitEditCabang, hapusCabang, loadCabangStatistik, lihatStatistikCabang } from './cabang.js';
import { loadUserTable, tampilFormTambahUser, submitUser, editUser, hapusUser } from './pengguna.js';
import { loadHPTable, tampilFormTambahHP, submitHP, lunasiHP } from './hutang.js';
import { loadPengaturanForm, submitPengaturan, buatBackup, restoreBackup, loadBackupHistory, setupAutomation } from './pengaturan.js';
import { connectPrinter, printReceipt, disconnectPrinter } from './printer.js';

// ================================================================
// EXPOSE KE WINDOW
// ================================================================

window.supabase = supabase;
window.getData = getData;
window.insertData = insertData;
window.updateData = updateData;
window.deleteData = deleteData;
window.callRPC = callRPC;

window.doLogin = doLogin;
window.doLogout = doLogout;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.checkSession = checkSession;

window.loadProduk = loadProduk;
window.renderProduk = renderProduk;
window.tambahKeKeranjang = tambahKeKeranjang;
window.ubahSatuanKeranjang = ubahSatuanKeranjang;
window.ubahQtyKeranjang = ubahQtyKeranjang;
window.hapusItemKeranjang = hapusItemKeranjang;
window.batalTransaksi = batalTransaksi;
window.updateKeranjangUI = updateKeranjangUI;
window.prosesTransaksi = prosesTransaksi;
window.cetakStruk = cetakStruk;
window.cetakStrukBluetooth = cetakStrukBluetooth;
window.scanBarcode = scanBarcode;
window.scanBarcodeForForm = scanBarcodeForForm;
window.openBarcodeScanner = openBarcodeScanner;
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.submitManualBarcode = submitManualBarcode;
window.formatRupiah = formatRupiah;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.filterProduk = filterProduk;

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
window.compressImage = compressImage;
window.previewGambar = previewGambar;
window.hitungPreviewHarga = hitungPreviewHarga;
window.hitungPreviewHargaEdit = hitungPreviewHargaEdit;
window.tampilFormTambahBarangWithBarcode = tampilFormTambahBarangWithBarcode;

window.loadLaporan = loadLaporan;
window.exportExcel = exportExcel;

window.loadDashboard = loadDashboard;
window.drawGrafik = drawGrafik;

window.initNotifikasi = initNotifikasi;
window.loadNotifikasi = loadNotifikasi;
window.showNotifToast = showNotifToast;
window.klikNotifikasi = klikNotifikasi;
window.toggleNotifDropdown = toggleNotifDropdown;
window.semuaDibaca = semuaDibaca;
window.updateNotifikasiUI = updateNotifikasiUI;

window.loadCabangTable = loadCabangTable;
window.tampilFormTambahCabang = tampilFormTambahCabang;
window.submitCabang = submitCabang;
window.editCabang = editCabang;
window.submitEditCabang = submitEditCabang;
window.hapusCabang = hapusCabang;
window.loadCabangStatistik = loadCabangStatistik;
window.lihatStatistikCabang = lihatStatistikCabang;

window.loadUserTable = loadUserTable;
window.tampilFormTambahUser = tampilFormTambahUser;
window.submitUser = submitUser;
window.editUser = editUser;
window.hapusUser = hapusUser;

window.loadHPTable = loadHPTable;
window.tampilFormTambahHP = tampilFormTambahHP;
window.submitHP = submitHP;
window.lunasiHP = lunasiHP;

window.loadPengaturanForm = loadPengaturanForm;
window.submitPengaturan = submitPengaturan;
window.buatBackup = buatBackup;
window.restoreBackup = restoreBackup;
window.loadBackupHistory = loadBackupHistory;
window.setupAutomation = setupAutomation;

window.connectPrinter = connectPrinter;
window.printReceipt = printReceipt;
window.disconnectPrinter = disconnectPrinter;

window.tutupModal = function() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('modalBody').innerHTML = '';
};

window.gantiHalaman = function(page) {
    const currentPage = window.currentPage || 'dashboard';
    if (page === currentPage) return;
    window.currentPage = page;
    
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.menu-item[data-page="' + page + '"]')?.classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard', kasir: 'Kasir', stok: 'Stok Barang',
        laporan: 'Laporan', cabang: 'Manajemen Cabang',
        pengguna: 'Pengguna', hutang: 'Hutang/Piutang', pengaturan: 'Pengaturan'
    };
    document.querySelector('.page-title').childNodes[0].textContent = titles[page] || 'Kasir';
    
    document.querySelectorAll('[id^="view-"]').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + page);
    if (target) target.style.display = '';
    
    const session = getCurrentUser();
    if (page === 'dashboard') {
        loadDashboard();
        setTimeout(() => { if (window.grafikData && window.grafikData.length > 0) drawGrafik(window.grafikData); }, 300);
    } else if (page === 'kasir') {
        renderProduk(window.produkData || []);
    } else if (page === 'stok') {
        loadStokTable();
    } else if (page === 'laporan') {
        loadLaporan();
    } else if (page === 'cabang') {
        loadCabangTable();
    } else if (page === 'pengguna') {
        loadUserTable();
    } else if (page === 'hutang') {
        loadHPTable();
    } else if (page === 'pengaturan') {
        loadPengaturanForm();
    }
    
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('notifDropdown').style.display = 'none';
};

async function initApp() {
    const isValid = await checkSession();
    if (!isValid) {
        document.getElementById('loginScreen').style.display = 'flex';
        return;
    }
    document.getElementById('loginScreen').style.display = 'none';
    
    const session = getCurrentUser();
    if (!session) return;
    
    document.getElementById('userName').textContent = session.user.nama_lengkap || session.user.username;
    document.getElementById('userRole').textContent = session.user.role === 'admin' ? 'Administrator' : 'Kasir';
    document.getElementById('userAvatar').textContent = (session.user.nama_lengkap || session.user.username).charAt(0).toUpperCase();
    document.getElementById('roleBadge').textContent = session.user.role === 'admin' ? 'Administrator' : 'Kasir';
    
    if (session.user.role !== 'admin') {
        document.querySelectorAll('.menu-item[data-page="cabang"]').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.menu-item[data-page="pengguna"]').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.menu-item[data-page="pengaturan"]').forEach(el => el.style.display = 'none');
    }
    
    if (session.cabangId) {
        const cabang = await getData('cabang', { id: session.cabangId });
        if (cabang && cabang.length > 0) {
            document.getElementById('cabangNama').textContent = cabang[0].nama;
        }
    }
    
    initNotifikasi(session.cabangId);
    
    const settings = await getData('pengaturan', { cabang_id: session.cabangId });
    if (settings && settings.length > 0) {
        const namaToko = settings.find(s => s.key === 'nama_toko');
        if (namaToko) {
            document.getElementById('namaToko').textContent = namaToko.value;
        }
        const logo = settings.find(s => s.key === 'logo_url');
        if (logo) {
            document.querySelector('.sidebar-header .logo').innerHTML = '<img src="' + logo.value + '" alt="Logo" />';
        }
    }
    
    await loadProduk(session.cabangId);
    await loadDashboard();
    
    const mediaQuery = window.matchMedia('(max-width:820px)');
    mediaQuery.addEventListener('change', function(e) {
        document.getElementById('toggleSidebar').style.display = e.matches ? 'block' : 'none';
        if (!e.matches) document.getElementById('sidebar').classList.remove('open');
    });
    if (mediaQuery.matches) document.getElementById('toggleSidebar').style.display = 'block';
    document.getElementById('toggleSidebar').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    setTimeout(() => {
        showNotifToast('👋 Selamat datang, ' + (session.user.nama_lengkap || session.user.username) + '!', 'success', 3000);
    }, 1000);
}

window.initApp = initApp;
initApp();

window.addEventListener('resize', function() {
    if (window.currentPage === 'dashboard' && window.grafikData && window.grafikData.length > 0) {
        drawGrafik(window.grafikData);
    }
});

window.produkData = [];
window.grafikData = [];
window.currentPage = 'dashboard';
window.isProcessing = false;
window.keranjang = [];