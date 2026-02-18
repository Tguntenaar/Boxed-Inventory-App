"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { getItemTypes, createItemType } from "@/supabase/queries/itemTypes";
import { createItem, updateItem } from "@/supabase/queries/items";
import { addItemPhoto } from "@/supabase/queries/itemPhotos";
import type { ItemType, PriceType } from "@/supabase/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Image as ImageIcon,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

export interface AddItemCardProps {
  boxId: string;
  onItemAdded: () => void;
}

export default function AddItemCard({ boxId, onItemAdded }: AddItemCardProps) {
  const supabase = useSupabaseClient();

  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [typeId, setTypeId] = useState<number | "">("");
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [value, setValue] = useState<string>("");
  const [condition, setCondition] = useState("");
  const [forSale, setForSale] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("vast");
  const [bidFrom, setBidFrom] = useState<string>("");
  const [deliveryPickup, setDeliveryPickup] = useState(true);
  const [deliveryShipping, setDeliveryShipping] = useState(false);

  // load existing types
  useEffect(() => {
    getItemTypes()
      .then(setItemTypes)
      .catch(() => toast.error("Failed to load item types."));
  }, []);

  const addType = async () => {
    const nm = newTypeName.trim();
    if (!nm) return toast.error("Type name required.");
    try {
      const t = await createItemType(nm);
      setItemTypes((prev) => [...prev, t]);
      setTypeId(t.id);
      setNewTypeName("");
      setAddingType(false);
      toast.success("New type added.");
    } catch {
      toast.error("Couldn’t create type.");
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) return toast.error("Item name required.");
    if (files.length > 10) return toast.error("Max 10 photos.");
    setUploading(true);

    try {
      const item = await createItem({
        box_id: boxId,
        name: name.trim(),
        quantity: qty,
        type_id: typeId === "" ? undefined : typeId,
        value: value ? parseFloat(value) : undefined,
        condition: condition.trim() || undefined,
        for_sale: forSale,
        marktplaats_category_name: categoryName.trim() || undefined,
        price_type: forSale ? priceType : undefined,
        bid_from: priceType === "bieden" && bidFrom ? parseFloat(bidFrom) : undefined,
        delivery_pickup: forSale ? deliveryPickup : undefined,
        delivery_shipping: forSale ? deliveryShipping : undefined,
      });

      let firstPhotoUrl: string | undefined;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const fileName = `${boxId}/${item.id}_${Date.now()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("item-photos")
          .upload(fileName, file);
        if (upErr) {
          toast.error("Upload failed.");
          setUploading(false);
          return;
        }
        const photoUrl = supabase.storage
          .from("item-photos")
          .getPublicUrl(fileName).data.publicUrl;
        await addItemPhoto({
          item_id: item.id,
          photo_url: photoUrl,
          sort_order: i,
        });
        if (i === 0) firstPhotoUrl = photoUrl;
      }

      if (firstPhotoUrl) {
        await updateItem(item.id, { photo_url: firstPhotoUrl });
      }

      toast.success("Item added!");
      setName("");
      setQty(1);
      setFiles([]);
      setTypeId("");
      setValue("");
      setCondition("");
      setForSale(false);
      setCategoryName("");
      setPriceType("vast");
      setBidFrom("");
      setDeliveryPickup(true);
      setDeliveryShipping(false);
      onItemAdded();
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full transition-shadow hover:shadow-lg">
      <CardHeader
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <CardTitle className="text-base font-medium">Add Item</CardTitle>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>

      {open && (
        <>
          <CardContent className="space-y-4">
            {/* ─ Type picker / inline create ─ */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Type</label>
              <div className="flex gap-2 items-center">
                {itemTypes.length > 0 ? (
                  <Select
                    value={typeId === "" ? undefined : String(typeId)}
                    onValueChange={(v) => setTypeId(v ? Number(v) : "")}
                    // @ts-ignore
                    className="flex-1"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1 rounded border border-input bg-background p-2 text-muted-foreground cursor-not-allowed">
                        No types yet
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        You haven’t created any types yet. Click the “+” to add
                        your first one.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {addingType ? (
                  <>
                    <Input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="New type"
                      className="w-32"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={addType}
                      aria-label="Save new type"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAddingType(false);
                        setNewTypeName("");
                      }}
                      aria-label="Cancel new type"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setAddingType(true)}
                    aria-label="Add new type"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* ─ Name & Qty ─ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                placeholder="Item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(+e.target.value)}
                placeholder="Qty"
              />
            </div>

            {/* ─ Price, condition, for sale ─ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                id="for-sale-add"
                checked={forSale}
                onChange={(e) => setForSale(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="for-sale-add" className="cursor-pointer text-sm">
                For sale (Marktplaats)
              </Label>
            </div>

            {forSale && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Marktplaats categorie</Label>
                  <Input
                    placeholder="e.g. Antiek | Bestek"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
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
                    <div className="space-y-2">
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
                      id="delivery-pickup-add"
                      checked={deliveryPickup}
                      onChange={(e) => setDeliveryPickup(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label
                      htmlFor="delivery-pickup-add"
                      className="cursor-pointer text-sm"
                    >
                      Ophalen
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="delivery-shipping-add"
                      checked={deliveryShipping}
                      onChange={(e) => setDeliveryShipping(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label
                      htmlFor="delivery-shipping-add"
                      className="cursor-pointer text-sm"
                    >
                      Verzenden
                    </Label>
                  </div>
                </div>
              </>
            )}

            {/* ─ Photo upload (1–10) ─ */}
            <div className="space-y-2">
              <Label className="text-sm">
                Foto&apos;s (optioneel, max 10)
              </Label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ImageIcon className="text-primary" />
                {files.length > 0
                  ? `${files.length} geselecteerd`
                  : "Upload foto's"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    setFiles((prev) =>
                      [...prev, ...selected].slice(0, 10),
                    );
                  }}
                />
              </label>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="justify-end">
            <Button disabled={uploading || !name.trim()} onClick={handleAdd}>
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <PlusCircle className="mr-1 h-4 w-4" /> Add
                </>
              )}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
