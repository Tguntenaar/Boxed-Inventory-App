"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, useSessionContext } from "@supabase/auth-helpers-react";
import { toast } from "sonner";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BoxCard from "@/components/BoxCard";
import ItemCard from "@/components/ItemCard";
import { getBoxesByOwner, getAccessibleBoxes } from "@/supabase/queries/boxes";
import {
  getItemsByBox,
  getItemsForSale,
} from "@/supabase/queries/items";
import { getPhotosByItemIds } from "@/supabase/queries/itemPhotos";
import { searchItems } from "@/supabase/queries/search";
import type { Box, Item } from "@/supabase/types";
import { Search, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import Head from "next/head";

function SortableBoxCard({ id, box }: { id: string; box: Box }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      {...attributes}
      className="group relative"
    >
      <button
        {...listeners}
        className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus:opacity-100 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <BoxCard box={box} />
    </div>
  );
}

export default function Dashboard() {
  const { session, isLoading: authLoading } = useSessionContext();
  const userId = session?.user.id!;
  const router = useRouter();

  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "for_sale">("all");

  const [exporting, setExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login");
    }
  }, [authLoading, session, router]);

  const LOCALSTORAGE_KEY = `dashboard-box-order-${userId}`;

  useEffect(() => {
    // wait until auth is initialized
    if (authLoading) return;
    // then bail if there’s no session or no userId
    if (!session || !userId) return;

    (async () => {
      try {
        const fetched = await getAccessibleBoxes(userId);
        setBoxes(fetched);

        // restore saved order, dropping any stale IDs
        const ids = fetched.map((b) => b.id);
        let saved: string[] = [];
        try {
          saved = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || "[]");
        } catch {}
        const kept = saved.filter((id) => ids.includes(id));
        const added = ids.filter((id) => !kept.includes(id));
        setOrder([...kept, ...added]);
      } catch (err) {
        console.error(err);
        toast.error("Could not load boxes.");
      }
    })();
  }, [authLoading, session, userId]);

  const handleDragStart = (_e: DragStartEvent) => {};
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !boxes) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    setBoxes(newOrder.map((id) => boxes.find((b) => b.id === id)!));
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(newOrder));
  };

  const debounceRef = useRef<number>(0);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const boxIds = boxes?.map((b) => b.id) ?? [];
    const shouldSearch = query.trim() || filterMode === "for_sale";
    if (!shouldSearch || (filterMode === "for_sale" && boxes === null)) {
      setResults([]);
      setLoadingSearch(false);
      return;
    }
    setLoadingSearch(true);
    debounceRef.current = window.setTimeout(async () => {
      const data = await searchItems(query.trim(), {
        forSale: filterMode === "for_sale" ? true : undefined,
        boxIds: boxIds.length ? boxIds : undefined,
      });
      setResults(data);
      setLoadingSearch(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, filterMode, boxes]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const allBoxes = await getBoxesByOwner(userId);
      const rows: Record<string, any>[] = [];
      const allItemIds: string[] = [];

      for (const bx of allBoxes) {
        const items = await getItemsByBox(bx.id);
        if (items.length) {
          items.forEach((it) => {
            allItemIds.push(it.id);
            rows.push({
              box_id: bx.id,
              box_name: bx.name,
              box_location: bx.location ?? "",
              box_status: bx.status,
              item_id: it.id,
              item_name: it.name,
              item_quantity: it.quantity ?? 0,
              item_value: it.value ?? "",
              item_condition: it.condition ?? "",
              item_for_sale: it.for_sale ?? false,
              item_ad_description: it.ad_description ?? "",
              item_marktplaats_category: it.marktplaats_category_name ?? "",
              item_price_type: it.price_type ?? "",
              item_bid_from: it.bid_from ?? "",
              item_delivery_pickup: it.delivery_pickup ?? false,
              item_delivery_shipping: it.delivery_shipping ?? false,
              item_photo_url: it.photo_url ?? "",
            });
          });
        } else {
          rows.push({
            box_id: bx.id,
            box_name: bx.name,
            box_location: bx.location ?? "",
            box_status: bx.status,
            item_id: "",
            item_name: "",
            item_quantity: "",
            item_value: "",
            item_condition: "",
            item_for_sale: "",
            item_ad_description: "",
            item_marktplaats_category: "",
            item_price_type: "",
            item_bid_from: "",
            item_delivery_pickup: "",
            item_delivery_shipping: "",
            item_photo_url: "",
          });
        }
      }

      const allPhotos = await getPhotosByItemIds(allItemIds);
      const photosByItem = new Map<string, string[]>();
      for (const p of allPhotos) {
        const arr = photosByItem.get(p.item_id) ?? [];
        arr.push(p.photo_url);
        photosByItem.set(p.item_id, arr);
      }
      for (const r of rows) {
        if (r.item_id) {
          const urls = photosByItem.get(r.item_id);
          r.item_photo_urls = urls?.length ? urls.join("; ") : r.item_photo_url ?? "";
        } else {
          r.item_photo_urls = "";
        }
      }

      const header = [
        "box_id",
        "box_name",
        "box_location",
        "box_status",
        "item_id",
        "item_name",
        "item_quantity",
        "item_value",
        "item_condition",
        "item_for_sale",
        "item_ad_description",
        "item_marktplaats_category",
        "item_price_type",
        "item_bid_from",
        "item_delivery_pickup",
        "item_delivery_shipping",
        "item_photo_url",
        "item_photo_urls",
      ];
      const csv = [
        header.join(","),
        ...rows.map((r) =>
          header.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "boxed_export.csv";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Export ready!");
    } catch (err) {
      console.error(err);
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportMarktplaats = async () => {
    setExporting(true);
    try {
      const accessibleBoxes = await getAccessibleBoxes(userId);
      const boxIds = accessibleBoxes.map((b) => b.id);
      const items = await getItemsForSale(boxIds);
      const boxMap = new Map(accessibleBoxes.map((b) => [b.id, b]));
      const allPhotos = await getPhotosByItemIds(items.map((i) => i.id));
      const photosByItem = new Map<string, string[]>();
      for (const p of allPhotos) {
        const arr = photosByItem.get(p.item_id) ?? [];
        arr.push(p.photo_url);
        photosByItem.set(p.item_id, arr);
      }

      const header = [
        "title",
        "description",
        "price_type",
        "price",
        "bid_from",
        "condition",
        "category",
        "delivery_pickup",
        "delivery_shipping",
        "photo_urls",
        "box_name",
      ];
      const rows = items.map((it) => {
        const urls = photosByItem.get(it.id);
        const photoUrls = urls?.length
          ? urls.join("; ")
          : it.photo_url ?? "";
        return {
          title: it.name,
          description: it.ad_description ?? "",
          price_type: it.price_type ?? "vast",
          price: it.value ?? "",
          bid_from: it.bid_from ?? "",
          condition: it.condition ?? "",
          category: it.marktplaats_category_name ?? "",
          delivery_pickup: it.delivery_pickup ?? false,
          delivery_shipping: it.delivery_shipping ?? false,
          photo_urls: photoUrls,
          box_name: boxMap.get(it.box_id)?.name ?? "",
        };
      });

      const csv = [
        header.join(","),
        ...rows.map((r) =>
          header.map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marktplaats_export.csv";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Marktplaats export ready!");
    } catch (err) {
      console.error(err);
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  if (!session) {
    return <p className="text-center text-muted-foreground">Please sign in.</p>;
  }

  return (
    <>
      <Head>
        <title>Dashboard - Boxed</title>
        <meta
          name="description"
          content="All your boxes and items in one place. Manage, search, and export your belongings efficiently."
        />
      </Head>

      <div className="container mx-auto px-6 py-8 space-y-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your Boxes</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back,{" "}
              <span className="font-medium">
                {session.user.user_metadata.full_name || "User"}
              </span>
              !
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/boxes/new">
              <Button>Add Box</Button>
            </Link>
            <Button onClick={exportCSV} disabled={exporting} variant="outline">
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              onClick={exportMarktplaats}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? "Exporting..." : "Export for Marktplaats"}
            </Button>
          </div>
        </header>

        <Card className="space-y-0">
          <CardHeader
            className="flex items-center justify-between cursor-pointer mt-0"
            onClick={() => setSearchOpen((o) => !o)}
          >
            <CardTitle>Find an Item</CardTitle>
            {searchOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>

          {searchOpen && (
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-md border border-input">
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className={`px-3 py-1.5 text-sm font-medium transition ${
                      filterMode === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    } rounded-l-md`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("for_sale")}
                    className={`px-3 py-1.5 text-sm font-medium transition ${
                      filterMode === "for_sale"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    } rounded-r-md`}
                  >
                    For sale
                  </button>
                </div>
                <Input
                  placeholder="Search by item name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Button disabled>
                  <Search size={16} className="mr-1" />
                  Search
                </Button>
              </div>

              {loadingSearch && <Skeleton className="h-20 w-full mt-2" />}

              {!loadingSearch && results.length > 0 && boxes && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {results.map((item) => {
                    const parentBox = boxes.find((b) => b.id === item.box_id);
                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        showBox={!!parentBox}
                        box={parentBox}
                      />
                    );
                  })}
                </div>
              )}

              {!loadingSearch &&
                (query.trim() !== "" || filterMode === "for_sale") &&
                results.length === 0 && (
                  <p className="mt-4 text-center text-muted-foreground">
                    {filterMode === "for_sale"
                      ? "No items for sale."
                      : `No results found for "${query.trim()}".`}
                  </p>
                )}
            </CardContent>
          )}
        </Card>

        <section>
          {!boxes ? (
            <Skeleton className="h-64 w-full" />
          ) : boxes.length === 0 ? (
            <p className="text-center text-muted-foreground">
              You have no boxes yet.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={order} strategy={rectSortingStrategy}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {order.map((id) => {
                    const box = boxes.find((b) => b.id === id)!;
                    return <SortableBoxCard key={id} id={id} box={box} />;
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <style jsx global>{`
          [data-rfd-drag-handle] {
            touch-action: none;
          }
        `}</style>
      </div>
    </>
  );
}
