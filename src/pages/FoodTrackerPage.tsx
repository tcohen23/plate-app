import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getLocalDateString } from "@/lib/dateUtils";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Camera, Plus, X, Trash2, Edit3, AlertCircle, CheckCircle2, Info, ChevronLeft, Mic, MicOff, Loader2 } from "lucide-react";
import { trackFoodLogged, trackBarcodeScanned } from "@/lib/posthog";
import { usePaywall } from "@/components/PaywallModal";
import { useAccessLevel } from "@/components/RequireSubscription";
import { calculateHealthScore } from "@/lib/healthScore";
import { searchFoodDatabase, FoodItem } from "@/lib/foodDatabase";

type ViewMode = "log" | "search" | "quick" | "custom" | "scanner" | "barcode_result" | "meal_detail" | "food_detail";


export function FoodTrackerPage() {
  const localDate = useMemo(() => getLocalDateString(), []);
  const todaysLog = useQuery(api.foodLogs.getTodaysLog, { localDate });
  const summary = useQuery(api.foodLogs.getDailySummary, { localDate });
  const allMeals = useQuery(api.meals.getAllMeals);
  const logFood = useMutation(api.foodLogs.logFood);
  const deleteLog = useMutation(api.foodLogs.deleteLog);
  const quickAdd = useMutation(api.foodLogs.quickAddCalories);
  const analyzeFoodImage = useAction(api.viktorTools.analyzeFoodImage);
  const parseFoodVoiceLog = useAction(api.viktorTools.parseFoodVoiceLog);
  const { isPremium } = useAccessLevel();
  const { paywallNode: barcodePaywall, openPaywall: openBarcodePaywall } = usePaywall("barcode");
  const { paywallNode: mealScanPaywall, openPaywall: openMealScanPaywall } = usePaywall("meal_scan");
  const { paywallNode: voicePaywall, openPaywall: openVoicePaywall } = usePaywall("voice_log");
  const [searchParams, setSearchParams] = useSearchParams();

  // Meal scan state
  const [mealScanLoading, setMealScanLoading] = useState(false);
  const [mealScanItems, setMealScanItems] = useState<any[]>([]);
  const [showMealScanResults, setShowMealScanResults] = useState(false);
  const mealScanInputRef = useRef<HTMLInputElement>(null);

  // Voice log state
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceItems, setVoiceItems] = useState<any[]>([]);
  const [showVoiceResults, setShowVoiceResults] = useState(false);
  const [voiceMacroItem, setVoiceMacroItem] = useState<any | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>("");
  // Barcode lookup via Open Food Facts API (client-side)
  const lookupBarcodeApi = async (barcode: string) => {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return { found: false, barcode };
    const data = await res.json();
    if (data.status !== 1 || !data.product) return { found: false, barcode };
    const p = data.product;
    const n = p.nutriments || {};

    // Prefer per-serving values if ALL 4 macros are present for serving
    const hasServing = (
      n["energy-kcal_serving"] != null &&
      n.proteins_serving != null &&
      n.carbohydrates_serving != null &&
      n.fat_serving != null
    );
    const usedServing = hasServing;
    const calories = Math.round(hasServing ? n["energy-kcal_serving"] : (n["energy-kcal_100g"] || 0));
    const protein = Math.round(hasServing ? n.proteins_serving : (n.proteins_100g || 0));
    const carbs = Math.round(hasServing ? n.carbohydrates_serving : (n.carbohydrates_100g || 0));
    const fat = Math.round(hasServing ? n.fat_serving : (n.fat_100g || 0));

    // Build serving label
    let servingLabel = p.serving_size || "";
    if (!hasServing && !servingLabel) {
      servingLabel = "per 100g";
    } else if (!hasServing && servingLabel) {
      servingLabel = "per 100g (serving: " + servingLabel + ")";
    }

    // Compute health score using the full product data
    const { score, color, label, reasons } = calculateHealthScore(p);

    return {
      found: true, barcode,
      name: p.product_name || p.generic_name || "Unknown Product",
      brand: p.brands || "",
      servingSize: servingLabel || "1 serving",
      imageUrl: p.image_front_small_url || p.image_url || "",
      calories, protein, carbs, fat,
      usedServing,
      healthScore: score,
      healthColor: color,
      healthLabel: label,
      healthReasons: reasons,
    };
  };

  const [view, setView] = useState<ViewMode>("log");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("breakfast");
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [servingUnit, setServingUnit] = useState<"serving" | "g" | "oz">("serving");
  const [servingAmount, setServingAmount] = useState("1");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Quick add state
  const [qaName, setQaName] = useState("");
  const [qaCal, setQaCal] = useState("");
  const [qaProtein, setQaProtein] = useState("");
  const [qaCarbs, setQaCarbs] = useState("");
  const [qaFat, setQaFat] = useState("");

  // Custom food state
  const [cfName, setCfName] = useState("");
  const [cfCal, setCfCal] = useState("");
  const [cfProtein, setCfProtein] = useState("");
  const [cfCarbs, setCfCarbs] = useState("");
  const [cfFat, setCfFat] = useState("");
  const [cfServing, setCfServing] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<any>(null);

  // Handle URL params: ?scanner=1, ?mealscan=1, ?voice=1
  useEffect(() => {
    const mode = searchParams.get("mode") || searchParams.get("scanner");
    const mealscan = searchParams.get("mealscan");
    const voice = searchParams.get("voice");
    if (mode === "scanner" || mode === "1") {
      setSearchParams({}, { replace: true });
      if (!isPremium) { setTimeout(() => openBarcodePaywall(), 300); }
      else { setTimeout(() => { setView("scanner"); startScanner(); }, 300); }
    } else if (mealscan === "1") {
      setSearchParams({}, { replace: true });
      if (!isPremium) { setTimeout(() => openMealScanPaywall(), 300); }
      else { setTimeout(() => { mealScanInputRef.current?.click(); }, 400); }
    } else if (mealscan === "image") {
      // Image captured via QuickActionSheet, stored in sessionStorage
      setSearchParams({}, { replace: true });
      const dataUrl = sessionStorage.getItem("quickMealScanImage");
      sessionStorage.removeItem("quickMealScanImage");
      if (dataUrl) {
        setMealScanLoading(true);
        setShowMealScanResults(true);
        analyzeFoodImage({ imageUrl: dataUrl }).then((items: any) => {
          if (items?.error === "vision_api_not_configured") {
            toast.error("Meal scan needs an AI vision key — contact support.");
            setMealScanItems([]);
          } else {
            setMealScanItems(Array.isArray(items) ? items : []);
            if (!items?.length) toast.info("Couldn't detect food in the photo. Try a clearer shot.");
          }
        }).catch(() => {
          toast.error("Meal scan failed. Please try again.");
        }).finally(() => setMealScanLoading(false));
      }
    } else if (voice === "1") {
      setSearchParams({}, { replace: true });
      if (!isPremium) { setTimeout(() => openVoicePaywall(), 300); }
      else { setShowVoiceResults(true); } // show modal so user can tap to start (iOS requires user gesture)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meal scan: open camera, capture image, call AI
  const handleMealScanFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMealScanLoading(true);
    setShowMealScanResults(true);
    try {
      // Convert to base64 data URL (pass to AI as image URL)
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res) => {
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });
      const items = await analyzeFoodImage({ imageUrl: dataUrl });
      if ((items as any)?.error === "vision_api_not_configured") {
        toast.error("Meal scan needs an AI vision key — contact support.");
        setMealScanItems([]);
      } else {
        const itemArr = Array.isArray(items) ? items : [];
        setMealScanItems(itemArr);
        if (!itemArr.length) toast.info("Couldn't detect food in the photo. Try a clearer shot.");
      }
    } catch {
      toast.error("Meal scan failed. Try again.");
      setMealScanItems([]);
    } finally {
      setMealScanLoading(false);
      if (e.target) e.target.value = "";
    }
  }, [analyzeFoodImage]);

  // Voice log: start speech recognition → parse transcript → show results
  const startVoiceLog = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice logging isn't supported on this browser. Try Chrome or Safari.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    voiceTranscriptRef.current = "";
    setVoiceTranscript("");
    setVoiceActive(true);
    setShowVoiceResults(false);
    setVoiceItems([]);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      voiceTranscriptRef.current = transcript;
      setVoiceTranscript(transcript);
    };

    recognition.onend = async () => {
      setVoiceActive(false);
      const finalTranscript = voiceTranscriptRef.current;
      if (!finalTranscript.trim()) return;
      setVoiceParsing(true);
      setShowVoiceResults(true);
      try {
        const items = await parseFoodVoiceLog({ transcript: finalTranscript });
        setVoiceItems(Array.isArray(items) ? items : []);
        if (!items?.length) toast.info("Couldn't find food in what you said. Try again.");
      } catch {
        toast.error("Voice parsing failed. Please try again.");
      } finally {
        setVoiceParsing(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") toast.error("Microphone error: " + event.error);
      setVoiceActive(false);
    };

    recognition.start();
  }, [parseFoodVoiceLog]);

  const stopVoiceLog = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceActive(false);
  }, []);

  const logDetectedItem = useCallback(async (item: any) => {
    try {
      await logFood({
        name: item.name,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        mealSlot: item.mealSlot || "snack",
        localDate,
      });
      toast.success(`${item.name} logged ✓`);
      return true;
    } catch {
      toast.error(`Failed to log ${item.name}`);
      return false;
    }
  }, [logFood, localDate]);

  const consumed = summary?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const entries = todaysLog?.length || 0;

  // Filter meals by search
  const filteredMeals = allMeals?.filter((m: any) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group logs by slot
  const slotOrder = ["breakfast", "lunch", "dinner", "snack"];
  const logsBySlot: Record<string, any[]> = {};
  for (const slot of slotOrder) {
    logsBySlot[slot] = (todaysLog || []).filter((l: any) => l.mealSlot === slot);
  }


  const handleQuickAdd = async () => {
    if (!qaCal) { toast.error("Enter calories"); return; }
    try {
      await quickAdd({
        calories: parseInt(qaCal),
        name: qaName || undefined,
        protein: qaProtein ? parseInt(qaProtein) : undefined,
        carbs: qaCarbs ? parseInt(qaCarbs) : undefined,
        fat: qaFat ? parseInt(qaFat) : undefined,
        localDate,
      });
      trackFoodLogged("quick_add");
      toast.success("Quick add logged");
      setView("log");
      setQaName(""); setQaCal(""); setQaProtein(""); setQaCarbs(""); setQaFat("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCustomFood = async () => {
    if (!cfName || !cfCal) { toast.error("Name and calories required"); return; }
    try {
      await logFood({
        mealSlot: selectedSlot,
        name: cfName,
        calories: parseInt(cfCal),
        protein: cfProtein ? parseInt(cfProtein) : 0,
        carbs: cfCarbs ? parseInt(cfCarbs) : 0,
        fat: cfFat ? parseInt(cfFat) : 0,
        servingSize: cfServing || undefined,
        localDate,
      });
      trackFoodLogged("custom");
      toast.success(`${cfName} logged`);
      setView("log");
      setCfName(""); setCfCal(""); setCfProtein(""); setCfCarbs(""); setCfFat(""); setCfServing("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBarcodeLookup = async (code: string) => {
    if (!code) return;
    setScanning(true);
    try {
      const result = await lookupBarcodeApi(code);
      trackBarcodeScanned(!!result?.found, code);
      setBarcodeResult(result);
      setView("barcode_result");
    } catch {
      trackBarcodeScanned(false, code);
      toast.error("Couldn't look up that barcode");
    } finally {
      setScanning(false);
    }
  };

  const handleLogBarcodeResult = async () => {
    if (!barcodeResult?.found) return;
    try {
      await logFood({
        mealSlot: selectedSlot,
        name: barcodeResult.name + (barcodeResult.brand ? ` (${barcodeResult.brand})` : ""),
        calories: barcodeResult.calories,
        protein: barcodeResult.protein,
        carbs: barcodeResult.carbs,
        fat: barcodeResult.fat,
        servingSize: barcodeResult.servingSize,
        localDate,
      });
      trackFoodLogged("barcode");
      toast.success(`${barcodeResult.name} logged`);
      setBarcodeResult(null);
      setView("log");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Camera barcode scanner using html5-qrcode (works on iOS + Android + desktop)
  const handleBarcodeRef = useRef(handleBarcodeLookup);
  handleBarcodeRef.current = handleBarcodeLookup;

  const startScanner = useCallback(async () => {
    setScannerActive(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // Ensure the container exists before starting
      await new Promise(r => setTimeout(r, 100));
      const containerId = "barcode-scanner-region";
      const container = document.getElementById(containerId);
      if (!container) {
        toast.error("Scanner container not ready. Please try again.");
        setScannerActive(false);
        return;
      }
      const scanner = new Html5Qrcode(containerId);
      html5ScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 16 / 9,
        },
        (decodedText: string) => {
          // Successfully scanned
          scanner.stop().then(() => {
            scanner.clear();
            html5ScannerRef.current = null;
            setScannerActive(false);
            handleBarcodeRef.current(decodedText);
          }).catch(() => {});
        },
        () => {
          // Scan failure (keep scanning) — no-op
        }
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        toast.error("Camera access denied. You can enter the barcode manually below.");
      } else {
        toast.error("Could not start scanner. Try entering the barcode manually.");
      }
      setScannerActive(false);
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (html5ScannerRef.current) {
      html5ScannerRef.current.stop().then(() => {
        html5ScannerRef.current?.clear();
        html5ScannerRef.current = null;
      }).catch(() => {
        html5ScannerRef.current = null;
      });
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif">Food log</h1>
        <span className="text-sm text-muted-foreground">{entries} entries</span>
      </div>

      {/* Macro summary */}
      <Card className="p-4 rounded-xl">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="label-uppercase text-muted-foreground">KCAL</div>
            <div className="text-xl font-serif mt-1">{Math.round(consumed.calories)}</div>
          </div>
          <div>
            <div className="label-uppercase text-muted-foreground">P</div>
            <div className="text-xl font-serif mt-1 text-blue-600 dark:text-blue-400">{Math.round(consumed.protein * 10) / 10}<span className="text-xs font-sans">g</span></div>
          </div>
          <div>
            <div className="label-uppercase text-muted-foreground">C</div>
            <div className="text-xl font-serif mt-1 text-amber-600 dark:text-amber-400">{Math.round(consumed.carbs * 10) / 10}<span className="text-xs font-sans">g</span></div>
          </div>
          <div>
            <div className="label-uppercase text-muted-foreground">F</div>
            <div className="text-xl font-serif mt-1 text-red-500 dark:text-red-400">{Math.round(consumed.fat * 10) / 10}<span className="text-xs font-sans">g</span></div>
          </div>
        </div>
      </Card>

      {/* Primary actions — scan & search */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            if (!isPremium) { openBarcodePaywall(); return; }
            setView("scanner"); startScanner();
          }}
          className="relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.98] transition-all"
        >
          {!isPremium && (
            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(229,180,84,0.2)", color: "#E5B454" }}>PRO</span>
          )}
          <Camera className="w-6 h-6" />
          <span className="text-sm font-semibold">Scan Barcode</span>
          <span className="text-[10px] opacity-70">Point camera at label</span>
        </button>
        <button
          onClick={() => { setView("search"); setSearchQuery(""); }}
          className="relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 active:scale-[0.98] transition-all"
        >
          <Search className="w-6 h-6" />
          <span className="text-sm font-semibold">Search Foods</span>
          <span className="text-[10px] opacity-70">Find from meal database</span>
        </button>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11 rounded-xl text-sm" onClick={() => setView("quick")}>
          <Plus className="w-4 h-4 mr-2" /> Quick add cals
        </Button>
        <Button variant="outline" className="h-11 rounded-xl text-sm" onClick={() => setView("custom")}>
          <Edit3 className="w-4 h-4 mr-2" /> Custom food
        </Button>
      </div>

      {/* Search overlay */}
      {view === "search" && (() => {
        const dbResults = searchFoodDatabase(searchQuery, 30);
        const hasQuery = searchQuery.trim().length > 0;
        return (
          <div className="space-y-3 animate-fade-up">
            <div className="flex items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search foods & meals..."
                className="h-11 rounded-xl bg-card"
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={() => setView("log")}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
              {/* Food database results */}
              {dbResults.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-1">Foods</p>
                  {dbResults.map((food) => (
                    <Card
                      key={food.id}
                      className="p-3 rounded-xl flex items-center justify-between hover:bg-accent/30 active:scale-[0.99] transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedFoodItem(food);
                        setServingUnit("serving");
                        setServingAmount("1");
                        setView("food_detail");
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{food.name}</div>
                        <div className="text-xs text-muted-foreground">{food.calories} kcal · {food.protein}g protein · {food.servingSize}</div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2 rotate-180" />
                    </Card>
                  ))}
                </>
              )}

              {/* Saved meals results */}
              {filteredMeals.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">Saved Meals</p>
                  {filteredMeals.slice(0, 20).map((meal: any) => (
                    <Card
                      key={meal._id}
                      className="p-3 rounded-xl flex items-center justify-between hover:bg-accent/30 active:scale-[0.99] transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedMeal(meal);
                        setServingUnit("serving");
                        setServingAmount("1");
                        setView("meal_detail");
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{meal.name}</div>
                        <div className="text-xs text-muted-foreground">{Math.round(meal.calories)} kcal · {Math.round(meal.protein)}g protein</div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2 rotate-180" />
                    </Card>
                  ))}
                </>
              )}

              {/* Empty state */}
              {hasQuery && dbResults.length === 0 && filteredMeals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No results found. Try a different search or create a custom food.</p>
              )}

              {/* Hint when no query */}
              {!hasQuery && (
                <p className="text-sm text-muted-foreground text-center py-6">Start typing to search 1,000+ foods</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Meal detail — macros per serving / oz / gram */}
      {view === "meal_detail" && selectedMeal && (() => {
        const meal = selectedMeal;
        // Estimate serving weight in grams based on category + calorie density
        const categoryWeights: Record<string, number> = {
          breakfast: 280, lunch: 380, dinner: 430, snack: 130,
        };
        const baseWeightG = categoryWeights[meal.category] || 350;

        // Per-unit macro calculation
        const perG = {
          cal: meal.calories / baseWeightG,
          protein: meal.protein / baseWeightG,
          carbs: meal.carbs / baseWeightG,
          fat: meal.fat / baseWeightG,
        };
        const perOz = { cal: perG.cal * 28.3495, protein: perG.protein * 28.3495, carbs: perG.carbs * 28.3495, fat: perG.fat * 28.3495 };

        // Compute adjusted macros based on selected serving unit + amount
        const amount = parseFloat(servingAmount) || 1;
        let multiplier = 1;
        if (servingUnit === "serving") multiplier = amount;
        else if (servingUnit === "g") multiplier = (amount / baseWeightG);
        else if (servingUnit === "oz") multiplier = (amount * 28.3495) / baseWeightG;

        const adj = {
          cal: Math.round(meal.calories * multiplier),
          protein: Math.round(meal.protein * multiplier * 10) / 10,
          carbs: Math.round(meal.carbs * multiplier * 10) / 10,
          fat: Math.round(meal.fat * multiplier * 10) / 10,
        };

        const handleLogSelected = async () => {
          try {
            await logFood({
              mealSlot: selectedSlot,
              name: meal.name + (multiplier !== 1 ? ` (${amount}${servingUnit === "serving" ? " serving" : servingUnit})` : ""),
              calories: adj.cal,
              protein: adj.protein,
              carbs: adj.carbs,
              fat: adj.fat,
              mealId: meal._id,
              localDate,
            });
            trackFoodLogged("search");
            toast.success(`${meal.name} logged`);
            setView("log");
            setSearchQuery("");
            setSelectedMeal(null);
          } catch (e: any) {
            toast.error(e.message);
          }
        };

        return (
          <div className="space-y-4 animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("search")}
                className="p-2 rounded-full hover:bg-accent/40 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight truncate">{meal.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{meal.category}</p>
              </div>
            </div>

            {/* Per-unit reference card */}
            <Card className="p-4 rounded-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nutrition info</p>

              {/* Per serving */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Per serving</span>
                  <span className="text-xs text-muted-foreground">~{baseWeightG}g</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <MacroBox label="Kcal" value={meal.calories} color="var(--foreground)" />
                  <MacroBox label="Protein" value={`${Math.round(meal.protein)}g`} color="#60a5fa" />
                  <MacroBox label="Carbs" value={`${Math.round(meal.carbs)}g`} color="#f97316" />
                  <MacroBox label="Fat" value={`${Math.round(meal.fat)}g`} color="#fbbf24" />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--border)" }} />

              {/* Per 100g and per oz row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "var(--surface-overlay)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Per 100g</p>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Calories</span><span className="font-medium">{Math.round(perG.cal * 100)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Protein</span><span className="font-medium text-blue-400">{(perG.protein * 100).toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Carbs</span><span className="font-medium text-orange-400">{(perG.carbs * 100).toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fat</span><span className="font-medium text-yellow-400">{(perG.fat * 100).toFixed(1)}g</span></div>
                  </div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--surface-overlay)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Per oz (28g)</p>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Calories</span><span className="font-medium">{Math.round(perOz.cal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Protein</span><span className="font-medium text-blue-400">{perOz.protein.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Carbs</span><span className="font-medium text-orange-400">{perOz.carbs.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fat</span><span className="font-medium text-yellow-400">{perOz.fat.toFixed(1)}g</span></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Serving size + live macros */}
            <Card className="p-4 rounded-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log amount</p>

              {/* Unit toggle */}
              <div className="flex gap-2">
                {(["serving", "g", "oz"] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => { setServingUnit(u); setServingAmount(u === "serving" ? "1" : u === "g" ? String(baseWeightG) : "10"); }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                      servingUnit === u ? "bg-foreground text-background border-foreground" : "border-border bg-card"
                    }`}
                  >
                    {u === "serving" ? "Serving" : u}
                  </button>
                ))}
              </div>

              <Input
                type="number"
                value={servingAmount}
                onChange={(e) => setServingAmount(e.target.value)}
                className="h-12 rounded-xl text-lg font-semibold text-center bg-background"
                min="0.1"
                step={servingUnit === "serving" ? "0.5" : servingUnit === "g" ? "10" : "0.5"}
              />

              {/* Live adjusted macros */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroBox label="Kcal" value={adj.cal} color="var(--foreground)" />
                <MacroBox label="Protein" value={`${adj.protein}g`} color="#60a5fa" />
                <MacroBox label="Carbs" value={`${adj.carbs}g`} color="#f97316" />
                <MacroBox label="Fat" value={`${adj.fat}g`} color="#fbbf24" />
              </div>

              {/* Slot selector */}
              <div className="flex gap-2 flex-wrap">
                {slotOrder.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                      selectedSlot === s ? "bg-foreground text-background border-foreground" : "bg-card border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <Button onClick={handleLogSelected} className="w-full h-12 rounded-xl font-semibold">
                Log to {selectedSlot}
              </Button>
            </Card>
          </div>
        );
      })()}

      {/* Food database item detail */}
      {view === "food_detail" && selectedFoodItem && (() => {
        const food = selectedFoodItem;
        const amount = parseFloat(servingAmount) || 1;
        const multiplier = servingUnit === "serving" ? amount : 1;

        const adj = {
          cal: Math.round(food.calories * multiplier),
          protein: Math.round(food.protein * multiplier * 10) / 10,
          carbs: Math.round(food.carbs * multiplier * 10) / 10,
          fat: Math.round(food.fat * multiplier * 10) / 10,
        };

        const handleLogFoodItem = async () => {
          try {
            await logFood({
              mealSlot: selectedSlot,
              name: food.name + (multiplier !== 1 ? ` (${amount} serving)` : ""),
              calories: adj.cal,
              protein: adj.protein,
              carbs: adj.carbs,
              fat: adj.fat,
              localDate,
            });
            trackFoodLogged("search");
            toast.success(`${food.name} logged`);
            setView("log");
            setSearchQuery("");
            setSelectedFoodItem(null);
          } catch (e: any) {
            toast.error(e.message);
          }
        };

        return (
          <div className="space-y-4 animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("search")}
                className="p-2 rounded-full hover:bg-accent/40 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight truncate">{food.name}</h3>
                <p className="text-xs text-muted-foreground">{food.servingSize} per serving</p>
              </div>
            </div>

            {/* Nutrition info card */}
            <Card className="p-4 rounded-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nutrition per serving</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroBox label="Kcal" value={food.calories} color="var(--foreground)" />
                <MacroBox label="Protein" value={`${food.protein}g`} color="#60a5fa" />
                <MacroBox label="Carbs" value={`${food.carbs}g`} color="#f97316" />
                <MacroBox label="Fat" value={`${food.fat}g`} color="#fbbf24" />
              </div>
            </Card>

            {/* Log amount */}
            <Card className="p-4 rounded-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log amount</p>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={servingAmount}
                  onChange={(e) => setServingAmount(e.target.value)}
                  className="h-12 rounded-xl text-lg font-semibold text-center bg-background flex-1"
                  min="0.1"
                  step="0.5"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">serving(s)</span>
              </div>

              {/* Live adjusted macros */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroBox label="Kcal" value={adj.cal} color="var(--foreground)" />
                <MacroBox label="Protein" value={`${adj.protein}g`} color="#60a5fa" />
                <MacroBox label="Carbs" value={`${adj.carbs}g`} color="#f97316" />
                <MacroBox label="Fat" value={`${adj.fat}g`} color="#fbbf24" />
              </div>

              {/* Slot selector */}
              <div className="flex gap-2 flex-wrap">
                {slotOrder.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                      selectedSlot === s ? "bg-foreground text-background border-foreground" : "bg-card border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <Button onClick={handleLogFoodItem} className="w-full h-12 rounded-xl font-semibold">
                Log to {selectedSlot}
              </Button>
            </Card>
          </div>
        );
      })()}

      {/* Barcode scanner */}
      {view === "scanner" && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-semibold">Scan Barcode</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { stopScanner(); setView("log"); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black border border-emerald-500/30 shadow-lg shadow-emerald-900/20" style={{ minHeight: scannerActive ? 260 : 0 }}>
            <div id="barcode-scanner-region" ref={scannerRef} />
            {scannerActive && (
              <div className="absolute bottom-3 left-0 right-0 text-center z-10">
                <span className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">📷 Point camera at the barcode on the package</span>
              </div>
            )}
          </div>

          <Card className="p-3.5 rounded-xl space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground">Don't have a camera? Type the barcode number:</p>
            <div className="flex gap-2">
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Enter barcode number (e.g. 049000042566)"
                className="h-11 rounded-xl bg-background text-sm font-mono"
              />
              <Button
                onClick={() => handleBarcodeLookup(barcodeInput)}
                disabled={!barcodeInput || scanning}
                className="h-11 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700"
              >
                {scanning ? "..." : "Look up"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Barcode result */}
      {view === "barcode_result" && barcodeResult && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Barcode Result</h3>
            <Button variant="ghost" size="sm" onClick={() => { setBarcodeResult(null); setView("log"); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {barcodeResult.found ? (
            <div className="space-y-3">
              {/* Product info + image */}
              <Card className="p-4 rounded-xl">
                <div className="flex gap-4 items-start">
                  {barcodeResult.imageUrl && (
                    <img
                      src={barcodeResult.imageUrl}
                      alt={barcodeResult.name}
                      className="w-20 h-20 rounded-lg object-cover bg-muted flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base">{barcodeResult.name}</div>
                    {barcodeResult.brand && <div className="text-sm text-muted-foreground mt-0.5">{barcodeResult.brand}</div>}
                    {barcodeResult.servingSize && <div className="text-xs text-muted-foreground mt-1">Serving: {barcodeResult.servingSize}</div>}
                  </div>
                </div>
              </Card>

              {/* Health Score Gauge */}
              <Card className="p-5 rounded-xl">
                <div className="flex items-center gap-5">
                  {/* Circular score gauge */}
                  <div className="relative flex-shrink-0" style={{ width: 90, height: 90 }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                      {/* Score arc */}
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke={barcodeResult.healthColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(barcodeResult.healthScore / 100) * 264} 264`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-serif font-bold" style={{ color: barcodeResult.healthColor }}>
                        {barcodeResult.healthScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-lg font-serif font-medium" style={{ color: barcodeResult.healthColor }}>
                      {barcodeResult.healthLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Health Score (1-100)</div>

                    {/* Color scale bar */}
                    <div className="mt-3 flex gap-0.5 h-2 rounded-full overflow-hidden">
                      <div className="flex-1 bg-red-500 rounded-l-full" />
                      <div className="flex-1 bg-orange-500" />
                      <div className="flex-1 bg-yellow-500" />
                      <div className="flex-1 bg-lime-500" />
                      <div className="flex-1 bg-green-500 rounded-r-full" />
                    </div>
                    <div className="relative mt-0.5 h-2">
                      <div
                        className="absolute w-2 h-2 bg-foreground rounded-full -top-0.5 transition-all"
                        style={{ left: `calc(${barcodeResult.healthScore}% - 4px)` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Reasons */}
                {barcodeResult.healthReasons && barcodeResult.healthReasons.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5">
                    {barcodeResult.healthReasons.map((reason: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {reason.includes("High") || reason.includes("Poor") || reason.includes("Ultra") || reason.includes("Very high") ? (
                          <AlertCircle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                        ) : reason.includes("Excellent") || reason.includes("Good") || reason.includes("Low sugar") || reason.includes("Low calorie") || reason.includes("fiber") || reason.includes("protein") || reason.includes("No additives") || reason.includes("Unprocessed") ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-muted-foreground">{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Macros */}
              <Card className="p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nutrition</span>
                  <span className="text-[10px] text-muted-foreground/70">{barcodeResult.usedServing ? `per serving (${barcodeResult.servingSize})` : barcodeResult.servingSize}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-muted rounded-lg">
                    <div className="text-lg font-serif font-bold">{Math.round(barcodeResult.calories)}</div>
                    <div className="label-uppercase text-muted-foreground">kcal</div>
                  </div>
                  <div className="p-2.5 bg-blue-500/10 rounded-lg">
                    <div className="text-lg font-serif font-bold text-blue-600 dark:text-blue-400">{Math.round(barcodeResult.protein * 10) / 10}g</div>
                    <div className="label-uppercase text-muted-foreground">protein</div>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 rounded-lg">
                    <div className="text-lg font-serif font-bold text-amber-600 dark:text-amber-400">{Math.round(barcodeResult.carbs * 10) / 10}g</div>
                    <div className="label-uppercase text-muted-foreground">carbs</div>
                  </div>
                  <div className="p-2.5 bg-red-500/10 rounded-lg">
                    <div className="text-lg font-serif font-bold text-red-500 dark:text-red-400">{Math.round(barcodeResult.fat * 10) / 10}g</div>
                    <div className="label-uppercase text-muted-foreground">fat</div>
                  </div>
                </div>
                {/* Macro total sanity check */}
                {barcodeResult.calories > 0 && (
                  <div className="text-[10px] text-center text-muted-foreground/50">
                    {barcodeResult.protein * 4 + barcodeResult.carbs * 4 + barcodeResult.fat * 9} kcal from macros ({Math.abs(barcodeResult.calories - (barcodeResult.protein * 4 + barcodeResult.carbs * 4 + barcodeResult.fat * 9)) <= 15 ? "✓ matches" : "~ approximate"})
                  </div>
                )}
              </Card>

              {/* Slot selector + log button */}
              <Card className="p-4 rounded-xl space-y-3">
                <div className="flex gap-2">
                  {slotOrder.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSlot(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                        selectedSlot === s ? "bg-foreground text-background border-foreground" : "bg-card border-border"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Button onClick={handleLogBarcodeResult} className="w-full h-11 rounded-xl">
                  Log to {selectedSlot}
                </Button>
              </Card>
            </div>
          ) : (
            <Card className="p-6 text-center rounded-xl">
              <p className="text-sm text-muted-foreground mb-3">Product not found for barcode {barcodeResult.barcode}</p>
              <Button variant="outline" size="sm" onClick={() => setView("custom")} className="rounded-full">
                Add manually instead
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Quick add */}
      {view === "quick" && (
        <Card className="p-4 rounded-xl space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Quick add</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("log")}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Input value={qaName} onChange={(e) => setQaName(e.target.value)} placeholder="Name (optional)" className="h-10 rounded-lg bg-background" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={qaCal} onChange={(e) => setQaCal(e.target.value)} placeholder="Calories *" type="number" className="h-10 rounded-lg bg-background" />
            <Input value={qaProtein} onChange={(e) => setQaProtein(e.target.value)} placeholder="Protein (g)" type="number" className="h-10 rounded-lg bg-background" />
            <Input value={qaCarbs} onChange={(e) => setQaCarbs(e.target.value)} placeholder="Carbs (g)" type="number" className="h-10 rounded-lg bg-background" />
            <Input value={qaFat} onChange={(e) => setQaFat(e.target.value)} placeholder="Fat (g)" type="number" className="h-10 rounded-lg bg-background" />
          </div>
          <Button onClick={handleQuickAdd} className="w-full h-11 rounded-xl">Add</Button>
        </Card>
      )}

      {/* Custom food */}
      {view === "custom" && (
        <Card className="p-4 rounded-xl space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Custom food</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("log")}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Input value={cfName} onChange={(e) => setCfName(e.target.value)} placeholder="Food name *" className="h-10 rounded-lg bg-background" />
          <Input value={cfServing} onChange={(e) => setCfServing(e.target.value)} placeholder="Serving size (e.g. 1 cup)" className="h-10 rounded-lg bg-background" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={cfCal} onChange={(e) => setCfCal(e.target.value)} placeholder="Calories *" type="number" className="h-10 rounded-lg bg-background" />
            <Input value={cfProtein} onChange={(e) => setCfProtein(e.target.value)} placeholder="Protein (g)" type="number" className="h-10 rounded-lg bg-background" />
            <Input value={cfCarbs} onChange={(e) => setCfCarbs(e.target.value)} placeholder="Carbs (g)" type="number" className="h-10 rounded-lg bg-background" />
            <Input value={cfFat} onChange={(e) => setCfFat(e.target.value)} placeholder="Fat (g)" type="number" className="h-10 rounded-lg bg-background" />
          </div>
          <div className="flex gap-2">
            {slotOrder.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSlot(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                  selectedSlot === s ? "bg-foreground text-background border-foreground" : "bg-card border-border"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={handleCustomFood} className="w-full h-11 rounded-xl">Log Custom Food</Button>
        </Card>
      )}

      {/* Daily logs */}
      {view === "log" && (
        <div className="space-y-4">
          {todaysLog && todaysLog.length > 0 ? (
            slotOrder.map(slot => {
              const items = logsBySlot[slot];
              if (!items || items.length === 0) return null;
              return (
                <div key={slot}>
                  <div className="label-uppercase text-muted-foreground mb-2">{slot}</div>
                  <div className="space-y-1.5">
                    {items.map((log: any) => (
                      <Card key={log._id} className="p-3 rounded-xl flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{log.name}</div>
                          <div className="text-xs text-muted-foreground">{Math.round(log.calories)} kcal · {Math.round(log.protein * 10) / 10}p · {Math.round(log.carbs * 10) / 10}c · {Math.round(log.fat * 10) / 10}f</div>
                        </div>
                        <button
                          onClick={() => deleteLog({ logId: log._id }).then(() => toast.success("Removed"))}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <Card className="p-8 text-center rounded-xl">
              <p className="text-sm text-muted-foreground">No food logged yet today.</p>
              <p className="text-xs text-muted-foreground mt-1">Tap a meal in your plan or use search above.</p>
            </Card>
          )}
        </div>
      )}

      {/* Hidden file input for meal scan */}
      <input
        ref={mealScanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleMealScanFile}
      />

      {/* Paywall nodes */}
      {barcodePaywall}
      {mealScanPaywall}
      {voicePaywall}

      {/* Meal Scan Results Modal */}
      {showMealScanResults && (
        <div className="fixed inset-0 z-[999] flex flex-col" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}>
          <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-safe-top pb-safe-bottom py-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Meal Scan Results</h2>
              <button onClick={() => { setShowMealScanResults(false); setMealScanItems([]); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            {mealScanLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#52B788" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Analyzing your meal...</p>
              </div>
            ) : mealScanItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <p className="text-sm text-white">No food detected in the photo.</p>
                <button onClick={() => { setShowMealScanResults(false); mealScanInputRef.current?.click(); }} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "#52B788", color: "#0d1f13" }}>Try Again</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Tap each item to log it</p>
                {mealScanItems.map((item, i) => (
                  <div key={i} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "#141414", border: "1px solid rgba(82,183,136,0.2)" }}>
                    <div>
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await logDetectedItem(item);
                        if (ok) setMealScanItems((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      className="ml-3 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "#52B788", color: "#0d1f13" }}
                    >
                      Log
                    </button>
                  </div>
                ))}
                {mealScanItems.length > 0 && (
                  <button
                    onClick={async () => {
                      await Promise.all(mealScanItems.map(logDetectedItem));
                      setShowMealScanResults(false);
                      setMealScanItems([]);
                    }}
                    className="w-full py-3 rounded-2xl font-semibold text-sm mt-2"
                    style={{ background: "#52B788", color: "#0d1f13" }}
                  >
                    Log All Items
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Log Modal */}
      {(voiceActive || showVoiceResults) && (
        <div className="fixed inset-0 z-[999] flex flex-col relative" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}>
          <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-safe-top pb-safe-bottom py-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Voice Log</h2>
              <button onClick={() => { stopVoiceLog(); setShowVoiceResults(false); setVoiceItems([]); setVoiceTranscript(""); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            {voiceActive ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(82,183,136,0.15)", border: "2px solid #52B788", animation: "pulse 1.5s infinite" }}>
                  <Mic className="w-8 h-8" style={{ color: "#52B788" }} />
                </div>
                <p className="text-white font-medium">Listening...</p>
                {voiceTranscript && <p className="text-sm text-center px-4" style={{ color: "rgba(255,255,255,0.6)" }}>"{voiceTranscript}"</p>}
                <button onClick={stopVoiceLog} className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm" style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
                  <MicOff className="w-4 h-4" /> Stop
                </button>
              </div>
            ) : voiceParsing ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#52B788" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Analyzing what you said...</p>
              </div>
            ) : voiceItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-5">
                {voiceTranscript ? (
                  <>
                    <p className="text-sm text-white">Couldn't detect food. Try again.</p>
                    <button onClick={startVoiceLog} className="px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2" style={{ background: "#52B788", color: "#0d1f13" }}>
                      <Mic className="w-4 h-4" /> Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(82,183,136,0.12)", border: "2px solid rgba(82,183,136,0.4)" }}>
                      <Mic className="w-10 h-10" style={{ color: "#52B788" }} />
                    </div>
                    <p className="text-white font-semibold text-lg">Tap to Speak</p>
                    <p className="text-sm text-center px-6" style={{ color: "rgba(255,255,255,0.45)" }}>Say what you ate — e.g. "two eggs and a banana"</p>
                    <button onClick={startVoiceLog} className="px-8 py-3.5 rounded-full font-semibold text-base" style={{ background: "#52B788", color: "#0d1f13" }}>
                      Start Recording
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Heard: "{voiceTranscript}"</p>
                {voiceItems.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                    style={{ background: "#141414", border: "1px solid rgba(82,183,136,0.2)" }}
                    onClick={() => setVoiceMacroItem(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{item.name}</p>
                        {item.fromDatabase && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>DB</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                      </p>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await logDetectedItem(item);
                        if (ok) {
                          const remaining = voiceItems.filter((_, idx) => idx !== i);
                          setVoiceItems(remaining);
                          if (remaining.length === 0) {
                            setShowVoiceResults(false);
                            setVoiceTranscript("");
                          }
                        }
                      }}
                      className="ml-3 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: "#52B788", color: "#0d1f13" }}
                    >
                      Log
                    </button>
                  </div>
                ))}
                {voiceItems.length > 0 && (
                  <button
                    onClick={async () => {
                      await Promise.all(voiceItems.map(logDetectedItem));
                      setShowVoiceResults(false);
                      setVoiceItems([]);
                      setVoiceTranscript("");
                    }}
                    className="w-full py-3 rounded-2xl font-semibold text-sm mt-2"
                    style={{ background: "#52B788", color: "#0d1f13" }}
                  >
                    Log All
                  </button>
                )}
              </div>

            )}
          </div>

          {/* Macro detail card overlay — inside the modal container for absolute positioning */}
          {voiceMacroItem && (
            <div
              className="absolute inset-0 z-10 flex items-end justify-center pb-8 px-4"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
              onClick={() => setVoiceMacroItem(null)}
            >
              <div
                className="w-full rounded-3xl p-5 flex flex-col gap-4"
                style={{ background: "#141414", border: "1px solid rgba(82,183,136,0.3)", maxWidth: "420px" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-base leading-snug">{voiceMacroItem.name}</p>
                    {voiceMacroItem.servingSize && (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>per {voiceMacroItem.servingSize}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setVoiceMacroItem(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center ml-3 flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                {/* Calories */}
                <div className="flex items-center justify-center py-3 rounded-2xl" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.15)" }}>
                  <div className="text-center">
                    <p className="text-3xl font-bold" style={{ color: "#52B788" }}>{voiceMacroItem.calories}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Calories</p>
                  </div>
                </div>
                {/* Macro grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Protein", value: voiceMacroItem.protein, unit: "g", color: "#60a5fa" },
                    { label: "Carbs", value: voiceMacroItem.carbs, unit: "g", color: "#fbbf24" },
                    { label: "Fat", value: voiceMacroItem.fat, unit: "g", color: "#f87171" },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="rounded-2xl p-3 flex flex-col items-center gap-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-lg font-bold" style={{ color }}>{value}{unit}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
                    </div>
                  ))}
                </div>
                {/* Fiber / Sugar / Sodium if available */}
                {(voiceMacroItem.fiber != null || voiceMacroItem.sugar != null || voiceMacroItem.sodium != null) && (
                  <div className="grid grid-cols-3 gap-2">
                    {voiceMacroItem.fiber != null && (
                      <div className="rounded-2xl p-3 flex flex-col items-center gap-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="text-base font-bold text-white">{voiceMacroItem.fiber}g</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Fiber</p>
                      </div>
                    )}
                    {voiceMacroItem.sugar != null && (
                      <div className="rounded-2xl p-3 flex flex-col items-center gap-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="text-base font-bold text-white">{voiceMacroItem.sugar}g</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Sugar</p>
                      </div>
                    )}
                    {voiceMacroItem.sodium != null && (
                      <div className="rounded-2xl p-3 flex flex-col items-center gap-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="text-base font-bold text-white">{voiceMacroItem.sodium}mg</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Sodium</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Log button */}
                <button
                  onClick={async () => {
                    const item = voiceMacroItem;
                    setVoiceMacroItem(null);
                    const ok = await logDetectedItem(item);
                    if (ok) {
                      const remaining = voiceItems.filter((v) => v !== item);
                      setVoiceItems(remaining);
                      if (remaining.length === 0) {
                        setShowVoiceResults(false);
                        setVoiceTranscript("");
                      }
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm"
                  style={{ background: "#52B788", color: "#0d1f13" }}
                >
                  Log {voiceMacroItem.name}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MacroBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl py-2.5 px-1 flex flex-col items-center gap-0.5" style={{ background: "var(--surface-overlay)" }}>
      <span className="text-base font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
