import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackGroceryListViewed } from "@/lib/posthog";
import { useState, useEffect, useRef } from "react";
import { ShoppingCart, RefreshCw, Check, ChevronDown, MapPin, Search, Loader2, CheckCircle2 } from "lucide-react";
import { PremiumGate, usePremiumAccess } from "@/components/PremiumGate";

export function GroceryPage() {
  const hasPremium = usePremiumAccess();
  if (hasPremium === false) {
    return <PremiumGate feature="grocery" featureLabel="Grocery List">{null}</PremiumGate>;
  }
  const groceryList = useQuery(api.grocery.getCurrentGroceryList);
  const syncStatus = useQuery(api.grocery.getGrocerySyncStatus);
  const storeData = useQuery(api.stores.getStoresForUser);
  const generateList = useMutation(api.grocery.generateGroceryList);
  const regenerateList = useMutation(api.grocery.regenerateGroceryList);
  const switchStore = useMutation(api.grocery.switchStore);
  const toggleItem = useMutation(api.grocery.toggleGroceryItem);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showAllStores, setShowAllStores] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");

  // Track sync status changes for auto-toast
  const prevSyncRef = useRef(syncStatus);
  useEffect(() => { trackGroceryListViewed(); }, []);

  useEffect(() => {
    const prev = prevSyncRef.current;
    if (prev && syncStatus && !prev.inSync && syncStatus.inSync && syncStatus.hasGrocery) {
      const added = (groceryList as any)?.lastSyncAdded as string[] | undefined;
      const removed = (groceryList as any)?.lastSyncRemoved as string[] | undefined;
      const parts: string[] = [];
      if (removed && removed.length > 0) parts.push(`${removed.length} removed`);
      if (added && added.length > 0) parts.push(`${added.length} added`);
      const detail = parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
      toast(`Grocery list synced${detail}`, { duration: 2500, icon: "✓" });
    }
    prevSyncRef.current = syncStatus;
  }, [syncStatus, groceryList]);

  const handleGenerate = async (storeKey?: string) => {
    setGenerating(true);
    try {
      await generateList({ storeKey });
      toast.success("Grocery list ready");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateList();
      toast.success("Grocery list regenerated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSwitchStore = async (storeKey: string, storeName: string) => {
    setSwitching(true);
    try {
      await switchStore({ storeKey });
      toast.success(`Switched to ${storeName}`);
      setShowAllStores(false);
      setStoreSearch("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSwitching(false);
    }
  };

  const handleToggle = async (index: number) => {
    try {
      await toggleItem({ itemIndex: index });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Empty state
  if (!groceryList) {
    return (
      <div className="px-5 pt-12 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <ShoppingCart className="w-8 h-8 text-foreground/40" />
        </div>
        <h1 className="text-3xl font-serif">Grocery list</h1>
        <p className="text-muted-foreground max-w-xs mx-auto">Generate your shopping list from your current meal plan.</p>
        <Button onClick={() => handleGenerate()} size="lg" disabled={generating} className="rounded-full px-8">
          {generating ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><ShoppingCart className="w-4 h-4 mr-2" /> Generate List</>
          )}
        </Button>
      </div>
    );
  }

  // Group items by category
  const categories: Record<string, Array<{ item: any; index: number }>> = {};
  groceryList.items.forEach((item: any, index: number) => {
    const cat = item.category || "Other";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ item, index });
  });

  const checkedCount = groceryList.items.filter((i: any) => i.checked).length;
  const totalCount = groceryList.items.length;
  const activeStore = groceryList.store || "Walmart";
  const isSyncing = syncStatus && !syncStatus.inSync && syncStatus.hasGrocery;

  // Store lists
  const localStores = storeData?.local || [];
  const allStores = storeData?.all || [];
  const filteredAll = allStores.filter((s: any) =>
    s.name.toLowerCase().includes(storeSearch.toLowerCase())
  );

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto space-y-5">
      {/* Title + regenerate */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif">Grocery list</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="h-9 rounded-full text-xs px-4"
        >
          {regenerating ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Syncing</>
          ) : (
            <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate</>
          )}
        </Button>
      </div>

      {/* Sync status indicator */}
      {isSyncing && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
          <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
          <span className="text-xs text-amber-700 dark:text-amber-400">Meal plan changed — updating grocery list…</span>
        </div>
      )}
      {syncStatus?.inSync && syncStatus?.hasGrocery && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-400">In sync with meal plan</span>
        </div>
      )}

      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{checkedCount}/{totalCount}</span>
        </div>
      )}

      {/* Store selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="label-uppercase text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Stores near you
          </div>
          <button
            onClick={() => setShowAllStores(!showAllStores)}
            className="text-xs text-primary font-medium flex items-center gap-0.5 hover:opacity-70 transition-opacity"
          >
            {showAllStores ? "Show local" : "Browse all"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showAllStores ? "rotate-180" : ""}`} />
          </button>
        </div>

        {!showAllStores ? (
          <div className="flex gap-2 flex-wrap">
            {localStores.map((store: any) => (
              <button
                key={store.key}
                disabled={switching}
                onClick={() => handleSwitchStore(store.key, store.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  store.name === activeStore
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border/60 text-foreground hover:border-foreground/30"
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search stores..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
              {filteredAll.map((store: any) => (
                <button
                  key={store.key}
                  disabled={switching}
                  onClick={() => handleSwitchStore(store.key, store.name)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${
                    store.name === activeStore
                      ? "bg-foreground text-background border-foreground"
                      : store.isLocal
                        ? "bg-card border-border/60 text-foreground hover:border-foreground/30"
                        : "bg-card/50 border-border/30 text-muted-foreground hover:border-foreground/20"
                  }`}
                >
                  <div>{store.name}</div>
                  {store.isLocal && (
                    <div className="text-[10px] opacity-60 mt-0.5 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" /> Near you
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categorized items — clean list, no prices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(categories).map(([category, items]) => (
        <div key={category}>
          <Card className="rounded-xl overflow-hidden bg-accent/40">
            <div className="px-4 pt-3.5 pb-2">
              <span className="label-uppercase text-muted-foreground">{category}</span>
            </div>
            <div className="divide-y divide-border/30">
              {items.map(({ item, index }) => (
                <button
                  key={index}
                  onClick={() => handleToggle(index)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-accent/50"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    item.checked
                      ? "bg-foreground border-foreground"
                      : "border-muted-foreground/30"
                  }`}>
                    {item.checked && <Check className="w-3 h-3 text-background" />}
                  </div>
                  <span className={`text-sm font-medium transition-all ${item.checked ? "line-through opacity-40" : ""}`}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      ))}
      </div>
    </div>
  );
}
