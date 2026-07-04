import { supabase } from "@/lib/supabaseClient";

/**
 * Service ini sengaja mengembalikan objek dengan bentuk (shape) yang PERSIS
 * sama dengan objek transaksi yang selama ini dipakai di App.jsx
 * ({ id, tanggal, jenis, kategori, nama, deskripsi, nominal, status, bukti }),
 * supaya komponen UI (TransaksiPage, TransaksiForm, LaporanPage, dst) tidak
 * perlu diubah sama sekali — hanya sumber datanya yang berpindah dari
 * localStorage ke Supabase.
 */

const SELECT_COLUMNS = "id, tanggal, jenis, kategori, nama, deskripsi, nominal, status, bukti, inventory_id, quantity";

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select(SELECT_COLUMNS)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(tx, userId) {
  // id tidak dikirim — dibuat otomatis oleh database (format TRX0001, dst)
  const { id, ...payload } = tx;
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...payload, created_by: userId ?? null })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(tx) {
  const { id, ...payload } = tx;
  const { data, error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
