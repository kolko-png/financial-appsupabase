import { supabase } from "@/lib/supabaseClient";

/**
 * DB pakai snake_case (harga_modal, harga_jual), sedangkan App.jsx sudah
 * terlanjur pakai camelCase (hargaModal, hargaJual). Service ini yang
 * menjembatani supaya komponen UI tidak perlu diubah.
 */

function toFrontend(row) {
  if (!row) return row;
  return {
    id: row.id,
    id_invoice: row.id_invoice,
    nama: row.nama,
    stok: row.stok,
    satuan: row.satuan,
    hargaModal: row.harga_modal,
    hargaJual: row.harga_jual,
  };
}

function toDb(item) {
  const db = {
    nama: item.nama,
    stok: item.stok,
    satuan: item.satuan,
    harga_modal: item.hargaModal,
    harga_jual: item.hargaJual,
  };
  if (item.id_invoice) db.id_invoice = item.id_invoice;
  return db;
}

export async function fetchInventory() {
  const { data, error } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toFrontend);
}

export async function createInventory(item, userId) {
  const { data, error } = await supabase
    .from("inventory")
    .insert({ ...toDb(item), created_by: userId ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return toFrontend(data);
}

export async function updateInventory(item) {
  const { data, error } = await supabase
    .from("inventory")
    .update(toDb(item))
    .eq("id", item.id)
    .select("*")
    .single();
  if (error) throw error;
  return toFrontend(data);
}

export async function deleteInventory(id) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}
