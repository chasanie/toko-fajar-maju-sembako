// ================================================================
// SUPABASE CLIENT - KONEKSI DATABASE
// ================================================================
// 🏪 Toko Fajar Maju Sembako
// ================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// ================================================================
// FUNGSI CRUD DASAR
// ================================================================

async function getData(table, filters = {}, options = {}) {
    let query = supabase.from(table).select(options.select || '*');
    
    if (options.cabangId) {
        query = query.eq('cabang_id', options.cabangId);
    }
    
    Object.keys(filters).forEach(key => {
        if (Array.isArray(filters[key])) {
            query = query.in(key, filters[key]);
        } else if (typeof filters[key] === 'object' && filters[key] !== null) {
            const op = filters[key].operator || 'eq';
            const col = filters[key].column || key;
            const val = filters[key].value;
            query = query[op](col, val);
        } else {
            query = query.eq(key, filters[key]);
        }
    });
    
    if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending || false 
        });
    }
    
    if (options.limit) {
        query = query.limit(options.limit);
    }
    
    if (options.range) {
        query = query.range(options.range.from, options.range.to);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
}

async function insertData(table, data) {
    const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();
    
    if (error) throw new Error(error.message);
    return result;
}

async function updateData(table, id, data, idColumn = 'id') {
    const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq(idColumn, id)
        .select();
    
    if (error) throw new Error(error.message);
    return result;
}

async function deleteData(table, id, idColumn = 'id') {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, id);
    
    if (error) throw new Error(error.message);
    return { success: true };
}

async function upsertData(table, data, onConflict = 'id') {
    const { data: result, error } = await supabase
        .from(table)
        .upsert(data, { onConflict: onConflict })
        .select();
    
    if (error) throw new Error(error.message);
    return result;
}

async function callRPC(functionName, params = {}) {
    const { data, error } = await supabase.rpc(functionName, params);
    if (error) throw new Error(error.message);
    return data;
}

// ================================================================
// FUNGSI REALTIME
// ================================================================

function subscribeRealtime(table, cabangId, callback, events = ['*']) {
    const channel = supabase
        .channel('realtime:' + table + ':' + cabangId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: table,
                filter: cabangId ? `cabang_id=eq.${cabangId}` : undefined
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe((status) => {
            console.log('Realtime subscription status:', status);
        });
    
    return channel;
}

function unsubscribeRealtime(channel) {
    if (channel) {
        channel.unsubscribe();
    }
}

// ================================================================
// FUNGSI KHUSUS UNTUK BISNIS
// ================================================================

async function getStokMenipis(cabangId) {
    return await getData('barang', {}, {
        cabangId: cabangId,
        select: 'kode, nama, stok, stok_minimal, satuan_dasar',
        orderBy: { column: 'stok', ascending: true }
    });
}

async function getKadaluarsa(cabangId) {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];
    
    return await getData('barang', {
        kadaluarsa: {
            column: 'kadaluarsa',
            operator: 'gte',
            value: today
        }
    }, {
        cabangId: cabangId,
        select: 'kode, nama, kadaluarsa, stok',
        orderBy: { column: 'kadaluarsa', ascending: true }
    });
}

async function getDashboardData(cabangId) {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek();
    const startOfMonth = getStartOfMonth();
    
    const transaksiHari = await getData('transaksi', { tanggal: today }, { cabangId: cabangId });
    const transaksiMinggu = await getData('transaksi', {
        tanggal: {
            column: 'tanggal',
            operator: 'gte',
            value: startOfWeek
        }
    }, { cabangId: cabangId });
    const transaksiBulan = await getData('transaksi', {
        tanggal: {
            column: 'tanggal',
            operator: 'gte',
            value: startOfMonth
        }
    }, { cabangId: cabangId });
    
    const totalOmzetHari = transaksiHari.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
    const totalOmzetMinggu = transaksiMinggu.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
    const totalOmzetBulan = transaksiBulan.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
    
    const produkMap = {};
    transaksiHari.forEach(t => {
        const kode = t.kode_barang;
        if (!produkMap[kode]) {
            produkMap[kode] = {
                nama: t.nama_barang || kode,
                qty: 0,
                omzet: 0
            };
        }
        produkMap[kode].qty += parseInt(t.qty) || 0;
        produkMap[kode].omzet += parseFloat(t.total) || 0;
    });
    const produkTerlaris = Object.values(produkMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
    
    const grafikData = await getGrafik7Hari(cabangId);
    const stokMenipis = await getStokMenipis(cabangId);
    const kadaluarsa = await getKadaluarsa(cabangId);
    
    const totalBarang = await getData('barang', {}, { cabangId: cabangId, select: 'id' });
    const totalPengguna = await getData('users', { cabang_id: cabangId }, { select: 'id' });
    
    return {
        tanggal: today,
        totalOmzetHari: totalOmzetHari,
        totalTransaksiHari: transaksiHari.length,
        totalOmzetMinggu: totalOmzetMinggu,
        totalTransaksiMinggu: transaksiMinggu.length,
        totalOmzetBulan: totalOmzetBulan,
        totalTransaksiBulan: transaksiBulan.length,
        stokMenipis: stokMenipis,
        kadaluarsa: kadaluarsa,
        produkTerlaris: produkTerlaris,
        grafik: grafikData,
        totalBarang: totalBarang.length,
        totalPengguna: totalPengguna.length
    };
}

async function getGrafik7Hari(cabangId) {
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        
        const transaksi = await getData('transaksi', { tanggal: dateStr }, { cabangId: cabangId });
        const total = transaksi.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        
        result.push({
            tanggal: dateStr,
            label: label,
            total: total,
            transaksi: transaksi.length
        });
    }
    return result;
}

function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now);
    start.setDate(diff);
    return start.toISOString().split('T')[0];
}

function getStartOfMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split('T')[0];
}

export {
    supabase,
    getData,
    insertData,
    updateData,
    deleteData,
    upsertData,
    callRPC,
    subscribeRealtime,
    unsubscribeRealtime,
    getStokMenipis,
    getKadaluarsa,
    getDashboardData,
    getGrafik7Hari,
    getStartOfWeek,
    getStartOfMonth
};