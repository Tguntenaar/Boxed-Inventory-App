"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Item, ItemType, Box, PriceType, ItemPhoto } from "@/supabase/types";
import { updateItem } from "@/supabase/queries/items";
import {
  getPhotosByItem,
  addItemPhoto,
  deleteItemPhoto,
  reorderItemPhotos,
} from "@/supabase/queries/itemPhotos";
import {
  Image as ImageIcon,
  CalendarClock,
  MapPin,
  Archive,
  Pencil,
  Camera,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

dayjs.extend(relativeTime);

const TYPE_COLOR_CLASSES = [
  "bg-red-100 text-red-800",
  "bg-green-100 text-green-800",
  "bg-blue-100 text-blue-800",
  "bg-yellow-100 text-yellow-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
];

export default function ItemCard({
  item,
  type,
  showBox = false,
  box,
}: {
  item: Item;
  type?: ItemType;
  showBox?: boolean;
  box?: Box;
}) {
  const supabase = useSupabaseClient();

  // local copy so UI updates immediately
  const [currentItem, setCurrentItem] = useState(item);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity);
  const [value, setValue] = useState<string>(
    item.value != null ? String(item.value) : ""
  );
  const [condition, setCondition] = useState(item.condition ?? "");
  const [forSale, setForSale] = useState(item.for_sale ?? false);
  const [adDescription, setAdDescription] = useState(
    item.ad_description ?? ""
  );
  const [categoryName, setCategoryName] = useState(
    item.marktplaats_category_name ?? ""
  );
  const [priceType, setPriceType] = useState<PriceType>(
    (item.price_type as PriceType) ?? "vast"
  );
  const [bidFrom, setBidFrom] = useState<string>(
    item.bid_from != null ? String(item.bid_from) : ""
  );
  const [deliveryPickup, setDeliveryPickup] = useState(
    item.delivery_pickup ?? true
  );
  const [deliveryShipping, setDeliveryShipping] = useState(
    item.delivery_shipping ?? false
  );
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // reset local item if parent prop changes
  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  // when dialog opens, initialize form fields and fetch photos
  useEffect(() => {
    if (open) {
      setName(currentItem.name);
      setQty(currentItem.quantity);
      setValue(currentItem.value != null ? String(currentItem.value) : "");
      setCondition(currentItem.condition ?? "");
      setForSale(currentItem.for_sale ?? false);
      setAdDescription(currentItem.ad_description ?? "");
      setCategoryName(currentItem.marktplaats_category_name ?? "");
      setPriceType((currentItem.price_type as PriceType) ?? "vast");
      setBidFrom(currentItem.bid_from != null ? String(currentItem.bid_from) : "");
      setDeliveryPickup(currentItem.delivery_pickup ?? true);
      setDeliveryShipping(currentItem.delivery_shipping ?? false);
      setFiles([]);
      getPhotosByItem(currentItem.id).then(setPhotos);
    }
  }, [open, currentItem]);

  const onSave = async () => {
    setUploading(true);
    let photo_url = currentItem.photo_url;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const fileName = `${currentItem.box_id}/${currentItem.id}_${Date.now()}_${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("item-photos")
          .upload(fileName, file);
        if (!uploadErr) {
          const url = supabase.storage
            .from("item-photos")
            .getPublicUrl(fileName).data.publicUrl;
          await addItemPhoto({
            item_id: currentItem.id,
            photo_url: url,
            sort_order: photos.length + i,
          });
          if (!photo_url) photo_url = url;
        }
      }

      const updated = await updateItem(currentItem.id, {
        name,
        quantity: qty,
        photo_url: photo_url ?? currentItem.photo_url,
        value: priceType === "vast" && value ? parseFloat(value) : null,
        condition: condition.trim() || null,
        for_sale: forSale,
        ad_description: adDescription.trim() || null,
        marktplaats_category_name: forSale ? categoryName.trim() || null : null,
        price_type: forSale ? priceType : null,
        bid_from: priceType === "bieden" && bidFrom ? parseFloat(bidFrom) : null,
        delivery_pickup: forSale ? deliveryPickup : null,
        delivery_shipping: forSale ? deliveryShipping : null,
      });
      setCurrentItem(updated);
      toast.success("Item updated.");
      setOpen(false);
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deleteItemPhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      toast.error("Failed to delete photo.");
    }
  };

  const getPriceLabel = () => {
    if (!currentItem.for_sale) {
      return currentItem.value != null
        ? `€${Number(currentItem.value).toFixed(2)}`
        : null;
    }
    const pt = currentItem.price_type ?? "vast";
    if (pt === "gratis") return "Gratis";
    if (pt === "zie_omschrijving") return "Zie omschrijving";
    if (pt === "bieden" && currentItem.bid_from != null)
      return `Bieden vanaf €${Number(currentItem.bid_from).toFixed(2)}`;
    if (pt === "vast" && currentItem.value != null)
      return `€${Number(currentItem.value).toFixed(2)}`;
    return null;
  };

  const typeBadgeClass = type
    ? TYPE_COLOR_CLASSES[type.id % TYPE_COLOR_CLASSES.length]
    : "";

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
      <p className="truncate text-lg font-medium">{currentItem.name}</p>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Qty: {currentItem.quantity}</span>
        {getPriceLabel() && <span>{getPriceLabel()}</span>}
        {currentItem.for_sale && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            For sale
          </span>
        )}
        {currentItem.for_sale && currentItem.delivery_pickup && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            Ophalen
          </span>
        )}
        {currentItem.for_sale && currentItem.delivery_shipping && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            Verzenden
          </span>
        )}
        {currentItem.last_used && (
          <>
            <CalendarClock size={14} />
            <span>{dayjs(currentItem.last_used).fromNow()}</span>
          </>
        )}
      </div>

      {/* Image */}
      {currentItem.photo_url ? (
        <img
          src={currentItem.photo_url}
          alt={currentItem.name}
          className="mt-2 h-24 w-full rounded border object-cover"
        />
      ) : (
        <div className="mt-2 flex h-24 w-full items-center justify-center rounded border bg-muted/10 text-muted-foreground">
          <ImageIcon size={32} />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        {type ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass}`}
          >
            {type.name}
          </span>
        ) : (
          <span />
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit item"
              className="shrink-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md space-y-6">
            <h2 className="text-lg font-semibold">Edit item</h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(+e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">Price (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Optional"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Condition</Label>
                  <Input
                    placeholder="e.g. As good as new"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="for-sale-edit"
                  checked={forSale}
                  onChange={(e) => setForSale(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="for-sale-edit" className="cursor-pointer text-sm">
                  For sale (Marktplaats)
                </Label>
              </div>

              {forSale && (
                <>
                  <div className="space-y-1">
                    <Label className="text-sm">Marktplaats categorie</Label>
                    <Input
                      placeholder="e.g. Antiek | Bestek"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Prijs type</Label>
                      <Select
                        value={priceType}
                        onValueChange={(v) => setPriceType(v as PriceType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vast">Vaste prijs</SelectItem>
                          <SelectItem value="bieden">Bieden</SelectItem>
                          <SelectItem value="zie_omschrijving">
                            Zie omschrijving
                          </SelectItem>
                          <SelectItem value="gratis">Gratis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {priceType === "bieden" && (
                      <div className="space-y-1">
                        <Label className="text-sm">Bieden vanaf (€)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={bidFrom}
                          onChange={(e) => setBidFrom(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="delivery-pickup-edit"
                        checked={deliveryPickup}
                        onChange={(e) => setDeliveryPickup(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label
                        htmlFor="delivery-pickup-edit"
                        className="cursor-pointer text-sm"
                      >
                        Ophalen
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="delivery-shipping-edit"
                        checked={deliveryShipping}
                        onChange={(e) => setDeliveryShipping(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label
                        htmlFor="delivery-shipping-edit"
                        className="cursor-pointer text-sm"
                      >
                        Verzenden
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Ad description (optional)</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Text for your Marktplaats ad"
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-sm">Foto&apos;s</Label>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {photos.map((p) => (
                      <div
                        key={p.id}
                        className="relative aspect-square overflow-hidden rounded border"
                      >
                        <img
                          src={p.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(p.id)}
                          className="absolute right-1 top-1 rounded bg-destructive/80 p-1 text-destructive-foreground hover:bg-destructive"
                          aria-label="Delete photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-1 h-4 w-4" />
                    Add photos
                  </Button>
                  {files.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      +{files.length} new
                    </span>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files ?? []);
                      setFiles((prev) => [...prev, ...selected].slice(0, 10 - photos.length));
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={onSave} disabled={uploading}>
                {uploading ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {showBox && box && (
        <div className="mt-4 flex items-center justify-between border-t pt-2 text-sm text-muted-foreground">
          <Link
            href={`/boxes/${box.id}`}
            className="flex items-center gap-1 transition hover:text-primary"
          >
            <Archive size={14} />
            <span className="truncate">{box.name}</span>
          </Link>
          {box.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{box.location}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
