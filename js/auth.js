// ================================================================
// AUTHENTIKASI - LOGIN/LOGOUT
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

import { supabase } from './supabase-client.js';

async function doLogin(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        
        if (error) throw new Error(error.message);
        
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        if (userError) {
            await supabase.auth.signOut();
            throw new Error('Akun belum dikonfigurasi. Hubungi admin.');
        }
        
        if (!userData.aktif) {
            await supabase.auth.signOut();
            throw new Error('Akun tidak aktif. Hubungi admin.');
        }
        
        const sessionData = {
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            user: userData,
            cabangId: userData.cabang_id,
            expiresAt: data.session.expires_at
        };
        localStorage.setItem('session', JSON.stringify(sessionData));
        
        try {
            await supabase.from('log_aktivitas').insert({
                username: userData.username,
                aktivitas: 'LOGIN_BERHASIL',
                detail: 'Login dari ' + navigator.userAgent
            });
        } catch (logError) {
            console.warn('Gagal mencatat log:', logError);
        }
        
        return {
            success: true,
            user: userData,
            token: data.session.access_token
        };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

async function doLogout() {
    try {
        const session = getCurrentUser();
        if (session) {
            await supabase.from('log_aktivitas').insert({
                username: session.user.username,
                aktivitas: 'LOGOUT',
                detail: 'Logout sukses'
            });
        }
    } catch (e) {}
    
    await supabase.auth.signOut();
    localStorage.removeItem('session');
    window.location.href = '/login.html';
}

function getCurrentUser() {
    const session = localStorage.getItem('session');
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

function isAuthenticated() {
    return getCurrentUser() !== null;
}

async function checkSession() {
    const session = getCurrentUser();
    if (!session) return false;
    
    try {
        const { data, error } = await supabase.auth.getUser(session.token);
        if (error || !data.user) {
            localStorage.removeItem('session');
            return false;
        }
        
        if (session.expiresAt) {
            const now = Math.floor(Date.now() / 1000);
            if (session.expiresAt - now < 300) {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                    refresh_token: session.refreshToken
                });
                if (!refreshError && refreshData.session) {
                    session.token = refreshData.session.access_token;
                    session.refreshToken = refreshData.session.refresh_token;
                    session.expiresAt = refreshData.session.expires_at;
                    localStorage.setItem('session', JSON.stringify(session));
                }
            }
        }
        
        return true;
    } catch (e) {
        localStorage.removeItem('session');
        return false;
    }
}

async function registerUser(email, password, userData) {
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });
        
        if (error) throw new Error(error.message);
        
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: data.user.id,
                username: userData.username,
                nama_lengkap: userData.nama_lengkap,
                role: userData.role || 'kasir',
                cabang_id: userData.cabang_id,
                shift: userData.shift || '',
                aktif: true
            });
        
        if (userError) {
            await supabase.auth.admin.deleteUser(data.user.id);
            throw new Error(userError.message);
        }
        
        return {
            success: true,
            user: data.user
        };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        if (error) throw new Error(error.message);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

export {
    doLogin,
    doLogout,
    getCurrentUser,
    isAuthenticated,
    checkSession,
    registerUser,
    resetPassword
};