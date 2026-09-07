// ================================================================
// NOTIFIKASI - REAL-TIME NOTIFICATIONS
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase, getData, updateData, subscribeRealtime, unsubscribeRealtime } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { formatRupiah } from './kasir.js';

let notifChannel = null;
let notifInterval = null;
let isNotifDropdownOpen = false;

function initNotifikasi(cabangId) {
    if (notifChannel) {
        unsubscribeRealtime(notifChannel);
    }
    notifChannel = subscribeRealtime('notifikasi', cabangId, (payload) => {
        if (payload.eventType === 'INSERT') {
            const notif = payload.new;
            showNotifToast(notif.pesan, notif.tipe);
            loadNotifikasi(cabangId);
            updateBadgeCount();
        }
    });
    loadNotifikasi(cabangId);
    if (notifInterval) clearInterval(notifInterval);
    notifInterval = setInterval(() => {
        loadNotifikasi(cabangId);
    }, 30000);
}

async function loadNotifikasi(cabangId) {
    try {
        const data = await getData('notifikasi', { cabang_id: cabangId }, {
            orderBy: { column: 'waktu', ascending: false },
            limit: 20
        });
        updateNotifikasiUI(data);
        updateBadgeCount(data);
        return data;
    } catch (e) {
        console.error('Error load notifikasi:', e);
        return [];
    }
}

function updateNotifikasiUI(notifikasi) {
    const list = document.getElementById('notifList');
    if (!list) return;
    if (!notifikasi || notifikasi.length === 0) {
        list.innerHTML = `<div style="padding:16px;text-align:center;color:#94a3b8;"><i class="fas fa-bell-slash" style="display:block;font-size:24px;margin-bottom:8px;"></i>Tidak ada notifikasi</div>`;
        return;
    }
    list.innerHTML = notifikasi.slice(0, 20).map(n => `
        <div class="notif-dropdown-item ${n.dibaca ? '' : 'belum-dibaca'}" onclick="window.klikNotifikasi('${n.id}', '${n.link}')">
            <span class="notif-icon-small">${getNotifIcon(n.tipe)}</span>
            <div class="notif-text">${n.pesan}<span class="notif-time-small">${formatWaktu(n.waktu)}</span></div>
            ${!n.dibaca ? '<span class="notif-status">● Baru</span>' : ''}
        </div>
    `).join('');
}

function updateBadgeCount(notifikasi) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (!notifikasi) {
        const session = getCurrentUser();
        if (session) loadNotifikasi(session.cabangId);
        return;
    }
    const belumDibaca = notifikasi.filter(n => !n.dibaca);
    if (belumDibaca.length > 0) {
        badge.style.display = 'block';
        badge.textContent = belumDibaca.length > 99 ? '99+' : belumDibaca.length;
    } else {
        badge.style.display = 'none';
    }
}

function showNotifToast(pesan, tipe, duration) {
    const container = document.getElementById('notifContainer');
    if (!container) return;
    const icons = { 'success': '✅', 'warning': '⚠️', 'danger': '❌', 'info': 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `notif-toast tipe-${tipe || 'info'}`;
    toast.innerHTML = `
        <span class="notif-icon">${icons[tipe] || 'ℹ️'}</span>
        <div class="notif-content">${pesan}<span class="notif-time">${new Date().toLocaleTimeString()}</span></div>
        <button class="notif-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration || 5000);
}

async function klikNotifikasi(id, link) {
    try {
        await updateData('notifikasi', id, { dibaca: true });
        const session = getCurrentUser();
        if (session) loadNotifikasi(session.cabangId);
    } catch (e) { console.error('Error marking read:', e); }
    document.getElementById('notifDropdown').style.display = 'none';
    isNotifDropdownOpen = false;
    if (link && link.startsWith('#')) {
        const page = link.replace('#', '');
        if (page && window.gantiHalaman) window.gantiHalaman(page);
    }
}

function toggleNotifDropdown() {
    const dd = document.getElementById('notifDropdown');
    if (!dd) return;
    isNotifDropdownOpen = !isNotifDropdownOpen;
    dd.style.display = isNotifDropdownOpen ? 'block' : 'none';
    if (isNotifDropdownOpen) {
        const session = getCurrentUser();
        if (session) loadNotifikasi(session.cabangId);
    }
}

async function semuaDibaca() {
    try {
        const session = getCurrentUser();
        if (!session) return;
        const data = await getData('notifikasi', { cabang_id: session.cabangId });
        for (const n of data) { if (!n.dibaca) await updateData('notifikasi', n.id, { dibaca: true }); }
        loadNotifikasi(session.cabangId);
        showNotifToast('✅ Semua notifikasi ditandai dibaca', 'success', 2000);
    } catch (e) {
        console.error('Error marking all read:', e);
        showNotifToast('❌ Gagal menandai semua dibaca', 'danger', 2000);
    }
}

function getNotifIcon(tipe) {
    const icons = { 'success': '✅', 'warning': '⚠️', 'danger': '❌', 'info': 'ℹ️' };
    return icons[tipe] || 'ℹ️';
}

function formatWaktu(waktu) {
    if (!waktu) return '';
    try {
        const date = new Date(waktu);
        return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return waktu; }
}

export { initNotifikasi, loadNotifikasi, showNotifToast, klikNotifikasi, toggleNotifDropdown, semuaDibaca, updateNotifikasiUI, updateBadgeCount };

window.klikNotifikasi = klikNotifikasi;
window.toggleNotifDropdown = toggleNotifDropdown;
window.semuaDibaca = semuaDibaca;
window.showNotifToast = showNotifToast;