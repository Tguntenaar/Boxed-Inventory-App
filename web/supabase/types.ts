import { z } from "zod";

export const profileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  created_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;
export type NewProfile = Omit<Profile, "created_at">;

export const boxSchema = z.object({
  id: z.string().uuid(),
  owner_profile_id: z.string().uuid(),
  name: z.string(),
  location: z.string().optional(),
  status: z.enum(["unpacked", "packed", "in_transit"]),
  photo_url: z.string().url().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Box = z.infer<typeof boxSchema>;
export type NewBox = Omit<Box, "id" | "created_at" | "updated_at">;

export const collaboratorSchema = z.object({
  box_id: z.string().uuid(),
  collaborator_profile_id: z.string().uuid(),
  role: z.string(),
});
export type Collaborator = z.infer<typeof collaboratorSchema>;
export type NewCollaborator = Collaborator;

export const itemTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type ItemType = z.infer<typeof itemTypeSchema>;
export type NewItemType = Omit<ItemType, "id">;

export type CollaboratorInfo = {
  id: string;
  name: string;
  email: string;
};

export const priceTypeSchema = z.enum([
  "vast",
  "bieden",
  "zie_omschrijving",
  "gratis",
]);
export type PriceType = z.infer<typeof priceTypeSchema>;

export const itemPhotoSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  photo_url: z.string(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type ItemPhoto = z.infer<typeof itemPhotoSchema>;
export type NewItemPhoto = Omit<ItemPhoto, "id" | "created_at">;

export const itemSchema = z.object({
  id: z.string().uuid(),
  box_id: z.string().uuid(),
  type_id: z.number().nullable().optional(),
  name: z.string(),
  quantity: z.number(),
  photo_url: z.string().url().nullable().optional(),
  last_used: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
  for_sale: z.boolean().nullable().optional(),
  ad_description: z.string().nullable().optional(),
  marktplaats_category_id: z.string().nullable().optional(),
  marktplaats_category_name: z.string().nullable().optional(),
  price_type: priceTypeSchema.nullable().optional(),
  bid_from: z.number().nullable().optional(),
  delivery_pickup: z.boolean().nullable().optional(),
  delivery_shipping: z.boolean().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Item = z.infer<typeof itemSchema>;
export type NewItem = Omit<Item, "id" | "created_at" | "updated_at">;

export const searchFiltersSchema = z.object({
  typeIds: z.array(z.number()).optional(),
  boxIds: z.array(z.string()).optional(),
  location: z.string().optional(),
  forSale: z.boolean().optional(),
});
export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: NewProfile;
        Update: Partial<NewProfile>;
      };
      boxes: {
        Row: Box;
        Insert: NewBox;
        Update: Partial<NewBox>;
      };
      box_collaborators: {
        Row: Collaborator;
        Insert: NewCollaborator;
        Update: Partial<NewCollaborator>;
      };
      item_types: {
        Row: ItemType;
        Insert: NewItemType;
        Update: Partial<NewItemType>;
      };
      items: {
        Row: Item;
        Insert: NewItem;
        Update: Partial<NewItem>;
      };
      item_photos: {
        Row: ItemPhoto;
        Insert: NewItemPhoto;
        Update: Partial<NewItemPhoto>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
