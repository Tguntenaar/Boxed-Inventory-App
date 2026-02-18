import { supabase } from "../client";
import { itemPhotoSchema } from "../types";
import type { ItemPhoto, NewItemPhoto } from "../types";

export const getPhotosByItem = async (itemId: string): Promise<ItemPhoto[]> => {
  const { data, error } = await supabase
    .from("item_photos")
    .select("*")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return itemPhotoSchema.array().parse(data ?? []);
};

export const getPhotosByItemIds = async (
  itemIds: string[],
): Promise<ItemPhoto[]> => {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("item_photos")
    .select("*")
    .in("item_id", itemIds)
    .order("item_id")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return itemPhotoSchema.array().parse(data ?? []);
};

export const addItemPhoto = async (
  photo: NewItemPhoto,
): Promise<ItemPhoto> => {
  const { data, error } = await supabase
    .from("item_photos")
    .insert(photo)
    .select("*")
    .single();
  if (error) throw error;
  return itemPhotoSchema.parse(data);
};

export const deleteItemPhoto = async (id: string): Promise<void> => {
  const { error } = await supabase.from("item_photos").delete().eq("id", id);
  if (error) throw error;
};

export const reorderItemPhotos = async (
  itemId: string,
  photoIds: string[],
): Promise<ItemPhoto[]> => {
  const updates = photoIds.map((id, i) =>
    supabase.from("item_photos").update({ sort_order: i }).eq("id", id).eq("item_id", itemId),
  );
  await Promise.all(updates);
  return getPhotosByItem(itemId);
};
