// ================================================================
// PRINTER - CETAK STRUK BLUETOOTH
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { getCurrentUser } from './auth.js';
import { formatRupiah, showNotifToast } from './kasir.js';

let printerDevice = null;
let isPrinterConnected = false;

function isWebBluetoothSupported() {
    return 'bluetooth' in navigator;
}

async function connectPrinter() {
    if (!isWebBluetoothSupported()) {
        showNotifToast('❌ Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge.', 'danger');
        return false;
    }
    if (isPrinterConnected) {
        showNotifToast('✅ Printer sudah terhubung', 'info');
        return true;
    }
    showNotifToast('🔍 Mencari printer Bluetooth...', 'info');
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
                { namePrefix: 'Printer' }, { namePrefix: 'POS' }, { namePrefix: 'BT' }, { namePrefix: 'Thermal' }
            ],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        printerDevice = { device, server, service, characteristic };
        isPrinterConnected = true;
        showNotifToast('✅ Printer Bluetooth terhubung!', 'success');
        return true;
    } catch (error) {
        console.error('Error connecting printer:', error);
        if (error.message.includes('cancelled')) {
            showNotifToast('⏹️ Koneksi dibatalkan', 'info');
        } else {
            showNotifToast('❌ Gagal konek printer: ' + error.message, 'danger');
        }
        return false;
    }
}

function disconnectPrinter() {
    if (printerDevice && printerDevice.device && printerDevice.device.gatt) {
        try { printerDevice.device.gatt.disconnect(); } catch (e) {}
    }
    isPrinterConnected = false;
    printerDevice = null;
    showNotifToast('🔌 Printer diputuskan', 'info');
}

function buildReceipt(data) {
    const maxCols = 32;
    const lineChar = '='.repeat(maxCols);
    const dashChar = '-'.repeat(maxCols);
    const lines = [];
    lines.push('\x1B\x61\x01'); // Center align
    lines.push('\x1D\x21\x11'); // Double size
    lines.push(centerText(data.namaToko || 'TOKO FAJAR MAJU SEMBAKO', maxCols));
    lines.push('\x1D\x21\x00'); // Normal size
    lines.push(centerText(data.alamat || 'Jl. Raya No. 123', maxCols));
    lines.push(centerText('Telp: ' + (data.telepon || '0812-3456-7890'), maxCols));
    lines.push('\x0A');
    lines.push(lineChar);
    lines.push('\x0A');
    lines.push('\x1B\x61\x00'); // Left align
    lines.push('Tanggal: ' + formatTanggal(new Date()));
    lines.push('Kasir: ' + (data.kasir || 'Admin'));
    lines.push('No. Transaksi: ' + (data.idTransaksi || '-'));
    lines.push('Pelanggan: ' + (data.pelanggan || 'Umum'));
    lines.push('\x0A');
    lines.push(dashChar);
    lines.push('\x0A');
    lines.push('\x1B\x45\x01'); // Bold on
    lines.push('Item'.padEnd(maxCols - 15) + 'Qty'.padStart(5) + 'Total'.padStart(10));
    lines.push('\x1B\x45\x00'); // Bold off
    lines.push(dashChar);
    lines.push('\x0A');
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            const nama = item.nama || 'Item';
            const qty = item.qty || 1;
            const harga = item.hargaSatuan || 0;
            const subtotal = item.subtotal || (qty * harga);
            const namaTrunc = nama.length > maxCols - 15 ? nama.substring(0, maxCols - 18) + '...' : nama;
            lines.push(namaTrunc);
            lines.push(`  ${qty} x ${formatRupiah(harga)} = ${formatRupiah(subtotal)}`);
            lines.push('\x0A');
        });
    }
    lines.push(dashChar);
    lines.push('\x0A');
    lines.push('\x1B\x61\x02'); // Right align
    lines.push('\x1B\x45\x01'); // Bold on
    lines.push('\x1D\x21\x11'); // Double size
    lines.push('TOTAL: ' + formatRupiah(data.total || 0));
    lines.push('\x1D\x21\x00'); // Normal size
    lines.push('\x1B\x45\x00'); // Bold off
    lines.push('\x0A');
    lines.push('\x1B\x61\x00'); // Left align
    lines.push('Metode Bayar: ' + (data.metodeBayar || 'Tunai'));
    lines.push('\x0A');
    lines.push('\x1B\x61\x01'); // Center align
    lines.push(lineChar);
    lines.push('\x0A');
    lines.push('* Terima kasih *');
    lines.push(centerText('📱 Scan untuk kembali', maxCols));
    lines.push(centerText('Toko Fajar Maju Sembako', maxCols));
    lines.push('\x0A');
    lines.push('\x0A');
    return lines.join('');
}

function centerText(text, maxCols = 32) {
    const padding = Math.max(0, Math.floor((maxCols - text.length) / 2));
    return ' '.repeat(padding) + text + ' '.repeat(Math.max(0, maxCols - text.length - padding));
}

function formatTanggal(date) {
    return date.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function printReceipt(data) {
    if (!isPrinterConnected) {
        const connected = await connectPrinter();
        if (!connected) {
            showNotifToast('⚠️ Printer tidak terhubung. Cetak menggunakan print preview.', 'warning');
            return false;
        }
    }
    showNotifToast('🖨️ Mencetak struk...', 'info');
    try {
        const receipt = buildReceipt(data);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(receipt);
        await printerDevice.characteristic.writeValue(bytes);
        await printerDevice.characteristic.writeValue(new Uint8Array([0x1D, 0x56, 0x00])); // Cut paper
        showNotifToast('✅ Struk berhasil dicetak!', 'success');
        return true;
    } catch (error) {
        console.error('Error printing:', error);
        showNotifToast('❌ Gagal cetak: ' + error.message, 'danger');
        return false;
    }
}

export { connectPrinter, disconnectPrinter, printReceipt, isPrinterConnected, isWebBluetoothSupported };

window.connectPrinter = connectPrinter;
window.disconnectPrinter = disconnectPrinter;
window.printReceipt = printReceipt;
window.isPrinterConnected = isPrinterConnected;