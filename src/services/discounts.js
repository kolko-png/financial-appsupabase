import { supabase } from "@/lib/supabaseClient";

/**
 * Service untuk master diskon. DB pakai snake_case (persentase),
 * tapi App.jsx juga pakai persentase (sama). Shape:
 * { id, nama, persentase }
 */

function toFrontend(row) {
  if (!row) return row;
  return {
    id: row.id,
    nama: row.nama,
    persentase: row.persentase,
  };
}

function toDb(item) {
  return {
    nama: item.nama,
    persentase: item.persentase,
  };
}

export async function fetchDiscounts() {
  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toFrontend);
}

export async function createDiscount(item, userId) {
  const { id, ...payload } = item;
  const { data, error } = await supabase
    .from("discounts")
    .insert({ ...toDb(payload), created_by: userId ?? null })
    .select("*")
    .single();
  if (error){
    console.error("Error creating discount:", error);
    throw error;
  } 
  return toFrontend(data);
}

export async function updateDiscount(item) {
  const { id, ...payload } = item;
  const { data, error } = await supabase
    .from("discounts")
    .update(toDb(payload))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toFrontend(data);
}

export async function deleteDiscount(id) {
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) throw error;
}
