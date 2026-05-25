/**
 * ScannerPage — Fullscreen calai-style scanner
 *
 * Modes:
 *  food     — Fullscreen camera → tap capture → AI meal analysis
 *  barcode  — Fullscreen camera → auto-detect barcode → lookup product
 *  label    — Fullscreen camera → tap capture → AI food-label analysis
 *  library  — Open photo library → AI meal analysis
 *
 * URL: /scanner?mode=food|barcode|label|library
 *
 * Quick Actions → Barcode Scan: /scanner?mode=barcode
 * Quick Actions → Meal Scan:    /scanner?mode=food
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { ArrowLeft, Zap, ZapOff, Image, Loader2 } from "lucide-react";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { trackBarcodeScanned, trackFoodLogged } from "@/lib/posthog";
import { getLocalDateString } from "@/lib/dateUtils";
import { useAccessLevel } from "@/components/RequireSubscription";
import { usePaywall } from "@/components/PaywallModal";
import { calculateHealthScore } from "@/lib/healthScore";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScanMode = "food" | "barcode" | "label" | "library";

interface BarcodeResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  servingSize?: string;
  imageUrl?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  healthScore?: number;
  healthColor?: string;
  healthLabel?: string;
  healthReasons?: string[];
}

// ─── Barcode lookup ───────────────────────────────────────────────────────────

async function lookupBarcode(code: string): Promise<BarcodeResult> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  if (!res.ok) return { found: false, barcode: code };
  const data = await res.json();
  if (data.status !== 1 || !data.product) return { found: false, barcode: code };
  const p = data.product;
  const n = p.nutriments || {};
  const hasServing = n["energy-kcal_serving"] != null && n.proteins_serving != null && n.carbohydrates_serving != null && n.fat_serving != null;
  const calories = Math.round(hasServing ? n["energy-kcal_serving"] : (n["energy-kcal_100g"] || 0));
  const protein = Math.round(hasServing ? n.proteins_serving : (n.proteins_100g || 0));
  const carbs = Math.round(hasServing ? n.carbohydrates_serving : (n.carbohydrates_100g || 0));
  const fat = Math.round(hasServing ? n.fat_serving : (n.fat_100g || 0));
  let servingLabel = p.serving_size || "";
  if (!hasServing && !servingLabel) servingLabel = "per 100g";
  else if (!hasServing && servingLabel) servingLabel = `per 100g (serving: ${servingLabel})`;
  const { score, color, label, reasons } = calculateHealthScore(p);
  return {
    found: true, barcode: code,
    name: p.product_name || p.generic_name || "Unknown Product",
    brand: p.brands || "",
    servingSize: servingLabel || "1 serving",
    imageUrl: p.image_front_small_url || p.image_url || "",
    calories, protein, carbs, fat,
    healthScore: score, healthColor: color, healthLabel: label, healthReasons: reasons,
  };
}

// ─── Scan Reticle ─────────────────────────────────────────────────────────────

function ScanReticle({ mode }: { mode: ScanMode }) {
  const isBarcode = mode === "barcode";
  const w = isBarcode ? 280 : 240;
  const h = isBarcode ? 120 : 240;
  const corner = 24;
  const thickness = 3;
  const color = "#ffffff";

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 10 }}
    >
      <div className="relative" style={{ width: w, height: h }}>
        {/* Animated scan line for barcode mode */}
        {isBarcode && (
          <div
            className="absolute left-0 right-0"
            style={{
              height: 2,
              background: "linear-gradient(90deg, transparent 0%, #52B788 30%, #52B788 70%, transparent 100%)",
              animation: "scan-line 1.6s ease-in-out infinite",
              zIndex: 2,
            }}
          />
        )}
        {/* Corner brackets */}
        {/* Top-left */}
        <div className="absolute top-0 left-0" style={{ width: corner, height: corner }}>
          <div className="absolute top-0 left-0" style={{ width: corner, height: thickness, background: color, borderRadius: 2 }} />
          <div className="absolute top-0 left-0" style={{ width: thickness, height: corner, background: color, borderRadius: 2 }} />
        </div>
        {/* Top-right */}
        <div className="absolute top-0 right-0" style={{ width: corner, height: corner }}>
          <div className="absolute top-0 right-0" style={{ width: corner, height: thickness, background: color, borderRadius: 2 }} />
          <div className="absolute top-0 right-0" style={{ width: thickness, height: corner, background: color, borderRadius: 2 }} />
        </div>
        {/* Bottom-left */}
        <div className="absolute bottom-0 left-0" style={{ width: corner, height: corner }}>
          <div className="absolute bottom-0 left-0" style={{ width: corner, height: thickness, background: color, borderRadius: 2 }} />
          <div className="absolute bottom-0 left-0" style={{ width: thickness, height: corner, background: color, borderRadius: 2 }} />
        </div>
        {/* Bottom-right */}
        <div className="absolute bottom-0 right-0" style={{ width: corner, height: corner }}>
          <div className="absolute bottom-0 right-0" style={{ width: corner, height: thickness, background: color, borderRadius: 2 }} />
          <div className="absolute bottom-0 right-0" style={{ width: thickness, height: corner, background: color, borderRadius: 2 }} />
        </div>
      </div>
      <style>{`
        @keyframes scan-line {
          0%   { top: 10%; }
          50%  { top: 80%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}

// ─── Macro box ───────────────────────────────────────────────────────────────

function MacroBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScannerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = (searchParams.get("mode") as ScanMode) || "food";
  const [mode, setMode] = useState<ScanMode>(initialMode);

  const { isPremium } = useAccessLevel();
  const { paywallNode: barcodePaywall, openPaywall: openBarcodePaywall } = usePaywall("barcode");
  const { paywallNode: mealScanPaywall, openPaywall: openMealScanPaywall } = usePaywall("meal_scan");

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Capture state
  const [capturing, setCapturing] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any[] | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [scanning, setScanning] = useState(false);

  // Barcode detection
  const barcodeDetectionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barcodeHandledRef = useRef(false);

  // Convex
  const localDate = getLocalDateString();
  const analyzeFoodImage = useAction(api.viktorTools.analyzeFoodImage);
  const logFood = useMutation(api.foodLogs.logFood);

  // Library file input
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // ── Start camera ──────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
      // Check torch support
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as any;
      if (caps?.torch) setTorchSupported(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        toast.error("Camera permission denied. Please allow camera access.");
      } else {
        toast.error("Could not start camera.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (barcodeDetectionRef.current) {
      clearInterval(barcodeDetectionRef.current);
      barcodeDetectionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // ── Toggle torch ──────────────────────────────────────────────────────────

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(prev => !prev);
    } catch {
      toast.error("Torch not supported on this device.");
    }
  }, [torchOn]);

  // ── Barcode detection loop ────────────────────────────────────────────────

  const startBarcodeDetection = useCallback(() => {
    barcodeHandledRef.current = false;
    const hasBarcodeDetector = "BarcodeDetector" in window;
    if (!hasBarcodeDetector) return;

    let detector: any;
    try {
      detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code", "data_matrix"],
      });
    } catch { return; }

    const detect = async () => {
      if (barcodeHandledRef.current || !videoRef.current || !cameraReady) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && !barcodeHandledRef.current) {
          barcodeHandledRef.current = true;
          hapticMedium();
          if (barcodeDetectionRef.current) {
            clearInterval(barcodeDetectionRef.current);
            barcodeDetectionRef.current = null;
          }
          await handleBarcodeFound(barcodes[0].rawValue);
        }
      } catch { /* keep scanning */ }
    };

    barcodeDetectionRef.current = setInterval(detect, 250);
  }, [cameraReady]);

  // ── Handle barcode found ──────────────────────────────────────────────────

  const handleBarcodeFound = async (code: string) => {
    setScanning(true);
    try {
      const result = await lookupBarcode(code);
      trackBarcodeScanned(!!result.found, code);
      setBarcodeResult(result);
    } catch {
      toast.error("Couldn't look up that barcode.");
    } finally {
      setScanning(false);
    }
  };

  // ── Capture frame for food/label scan ────────────────────────────────────

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || capturing) return;
    hapticMedium();
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const MAX_W = 1024;
      const scale = video.videoWidth > MAX_W ? MAX_W / video.videoWidth : 1;
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      setCapturedFrame(dataUrl);
      const items = await analyzeFoodImage({ imageUrl: dataUrl });
      if ((items as any)?.error === "vision_api_not_configured") {
        toast.error("Meal scan needs an AI vision key — contact support.");
        setScanResult([]);
      } else {
        const arr = Array.isArray(items) ? items : [];
        setScanResult(arr);
        if (!arr.length) toast.info("No food detected. Try a clearer shot.");
      }
    } catch {
      toast.error("Scan failed. Try again.");
      setScanResult([]);
    } finally {
      setCapturing(false);
    }
  }, [analyzeFoodImage, capturing]);

  // ── Log scanned food items ────────────────────────────────────────────────

  const logAllItems = async () => {
    if (!scanResult?.length) return;
    try {
      await Promise.all(
        scanResult.map(item =>
          logFood({
            mealSlot: "lunch",
            name: item.name,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            servingSize: item.servingSize || "",
            localDate,
          })
        )
      );
      trackFoodLogged("meal_scan");
      toast.success(`${scanResult.length} item${scanResult.length > 1 ? "s" : ""} logged!`);
      navigate("/track");
    } catch {
      toast.error("Failed to log. Try again.");
    }
  };

  // ── Log barcode result ────────────────────────────────────────────────────

  const logBarcodeItem = async () => {
    if (!barcodeResult?.found) return;
    try {
      await logFood({
        mealSlot: "lunch",
        name: barcodeResult.name! + (barcodeResult.brand ? ` (${barcodeResult.brand})` : ""),
        calories: barcodeResult.calories || 0,
        protein: barcodeResult.protein || 0,
        carbs: barcodeResult.carbs || 0,
        fat: barcodeResult.fat || 0,
        servingSize: barcodeResult.servingSize || "",
        localDate,
      });
      trackFoodLogged("barcode");
      toast.success(`${barcodeResult.name} logged!`);
      navigate("/track");
    } catch {
      toast.error("Failed to log. Try again.");
    }
  };

  // ── Mode switch ───────────────────────────────────────────────────────────

  const switchMode = useCallback((newMode: ScanMode) => {
    hapticLight();
    // Clear results
    setScanResult(null);
    setCapturedFrame(null);
    setBarcodeResult(null);
    barcodeHandledRef.current = false;

    // Stop barcode detection if leaving barcode mode
    if (barcodeDetectionRef.current) {
      clearInterval(barcodeDetectionRef.current);
      barcodeDetectionRef.current = null;
    }

    // Library: open file picker
    if (newMode === "library") {
      libraryInputRef.current?.click();
      return;
    }

    setMode(newMode);
  }, []);

  // ── Library file handler ──────────────────────────────────────────────────

  const handleLibraryFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMode("library");
    setCapturing(true);
    setScanResult(null);
    try {
      const reader = new FileReader();
      const rawDataUrl: string = await new Promise(res => { reader.onload = () => res(reader.result as string); reader.readAsDataURL(file); });
      // Resize to max 1024px wide to keep payload small
      const dataUrl: string = await new Promise((resolve) => {
        const img: HTMLImageElement = new (window.Image as any)();
        img.onload = () => {
          const MAX_W = 1024;
          const scale = img.naturalWidth > MAX_W ? MAX_W / img.naturalWidth : 1;
          const c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          const x = c.getContext("2d") as CanvasRenderingContext2D;
          x.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.75));
        };
        img.src = rawDataUrl;
      });
      setCapturedFrame(dataUrl);
      const items = await analyzeFoodImage({ imageUrl: dataUrl });
      const arr = Array.isArray(items) ? items : [];
      setScanResult(arr);
      if (!arr.length) toast.info("No food detected in this photo.");
    } catch {
      toast.error("Photo scan failed.");
      setScanResult([]);
    } finally {
      setCapturing(false);
    }
  }, [analyzeFoodImage]);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Check premium gate
  useEffect(() => {
    if (isPremium === false) {
      if (mode === "barcode") openBarcodePaywall();
      else openMealScanPaywall();
    }
  }, [isPremium]);

  // Start camera on mount (not for library mode)
  useEffect(() => {
    if (mode !== "library") startCamera();
    return () => stopCamera();
  }, []);

  // Start barcode detection when mode=barcode and camera is ready
  useEffect(() => {
    if (mode === "barcode" && cameraReady && !barcodeResult) {
      startBarcodeDetection();
    } else {
      if (barcodeDetectionRef.current) {
        clearInterval(barcodeDetectionRef.current);
        barcodeDetectionRef.current = null;
      }
    }
    return () => {
      if (barcodeDetectionRef.current) {
        clearInterval(barcodeDetectionRef.current);
        barcodeDetectionRef.current = null;
      }
    };
  }, [mode, cameraReady, barcodeResult, startBarcodeDetection]);

  // ── Render bottom sheet (scan/barcode results) ────────────────────────────

  const renderResultSheet = () => {
    // Barcode scanning in progress
    if (mode === "barcode" && scanning) {
      return (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#52B788" }} />
          <p className="text-sm text-white/70">Looking up product…</p>
        </div>
      );
    }

    // Barcode found
    if (mode === "barcode" && barcodeResult) {
      if (!barcodeResult.found) {
        return (
          <div className="py-5 px-5 space-y-4">
            <p className="text-sm text-white/70 text-center">Product not found in database.</p>
            <p className="text-xs text-white/40 text-center">Barcode: {barcodeResult.barcode}</p>
            <button
              onClick={() => { setBarcodeResult(null); barcodeHandledRef.current = false; startBarcodeDetection(); }}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
            >
              Try Again
            </button>
          </div>
        );
      }

      return (
        <div className="py-4 px-5 space-y-4">
          <div className="flex gap-4 items-center">
            {barcodeResult.imageUrl && (
              <img src={barcodeResult.imageUrl} alt={barcodeResult.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{barcodeResult.name}</p>
              {barcodeResult.brand && <p className="text-xs text-white/50 mt-0.5">{barcodeResult.brand}</p>}
              {barcodeResult.servingSize && <p className="text-xs text-white/40 mt-0.5">{barcodeResult.servingSize}</p>}
            </div>
            {barcodeResult.healthColor && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex flex-col items-center justify-center border-2" style={{ borderColor: barcodeResult.healthColor }}>
                <span className="text-xs font-bold" style={{ color: barcodeResult.healthColor }}>{barcodeResult.healthScore}</span>
              </div>
            )}
          </div>
          <div className="flex gap-5 justify-center py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <MacroBox label="Kcal" value={barcodeResult.calories ?? 0} color="#fff" />
            <MacroBox label="Protein" value={`${barcodeResult.protein ?? 0}g`} color="#60a5fa" />
            <MacroBox label="Carbs" value={`${barcodeResult.carbs ?? 0}g`} color="#fb923c" />
            <MacroBox label="Fat" value={`${barcodeResult.fat ?? 0}g`} color="#fbbf24" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setBarcodeResult(null); barcodeHandledRef.current = false; startBarcodeDetection(); }}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
            >
              Rescan
            </button>
            <button
              onClick={logBarcodeItem}
              className="flex-1 py-3 rounded-2xl text-sm font-bold"
              style={{ background: "#52B788", color: "#0a1a0a" }}
            >
              Log Food
            </button>
          </div>
        </div>
      );
    }

    // Food/label scan processing
    if ((mode === "food" || mode === "label" || mode === "library") && capturing) {
      return (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#52B788" }} />
          <p className="text-sm text-white/70">Analyzing your meal…</p>
        </div>
      );
    }

    // Scan results
    if (scanResult !== null) {
      if (scanResult.length === 0) {
        return (
          <div className="py-5 px-5 space-y-4">
            <p className="text-sm text-white/70 text-center">No food detected. Try a clearer shot.</p>
            <button
              onClick={() => { setScanResult(null); setCapturedFrame(null); }}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
            >
              Try Again
            </button>
          </div>
        );
      }

      return (
        <div className="py-4 px-5 space-y-4 max-h-80 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Detected Items</p>
          {scanResult.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                {item.servingSize && <p className="text-xs text-white/40 mt-0.5">{item.servingSize}</p>}
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <MacroBox label="kcal" value={item.calories ?? 0} color="#fff" />
                <MacroBox label="P" value={`${item.protein ?? 0}g`} color="#60a5fa" />
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setScanResult(null); setCapturedFrame(null); }}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
            >
              Rescan
            </button>
            <button
              onClick={logAllItems}
              className="flex-1 py-3 rounded-2xl text-sm font-bold"
              style={{ background: "#52B788", color: "#0a1a0a" }}
            >
              Log All
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const hasResults = (mode === "barcode" && (barcodeResult || scanning)) ||
    ((mode === "food" || mode === "label" || mode === "library") && (capturing || scanResult !== null));

  const MODES: { key: ScanMode; label: string; emoji: string }[] = [
    { key: "food", label: "Scan food", emoji: "📷" },
    { key: "barcode", label: "Barcode", emoji: "📦" },
    { key: "label", label: "Food label", emoji: "🏷️" },
    { key: "library", label: "Library", emoji: "🖼️" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#000" }}>
      {/* Camera view */}
      <div className="relative flex-1 overflow-hidden">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: mode === "library" && capturedFrame ? "none" : "block" }}
        />

        {/* Captured frame preview (for food/label scan) */}
        {capturedFrame && mode !== "barcode" && (
          <img
            src={capturedFrame}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark overlay when camera not ready */}
        {!cameraReady && mode !== "library" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        )}

        {/* Scan reticle */}
        {cameraReady && !hasResults && mode !== "library" && (
          <ScanReticle mode={mode} />
        )}

        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-safe-top"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 20px)",
            paddingBottom: 16,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
            zIndex: 20,
          }}
        >
          <button
            onClick={() => { stopCamera(); navigate(-1); }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <span className="text-base font-semibold text-white" style={{ letterSpacing: "0.01em" }}>Scanner</span>

          {torchSupported ? (
            <button
              onClick={toggleTorch}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
            >
              {torchOn ? <Zap className="w-5 h-5" style={{ color: "#FFD700" }} /> : <ZapOff className="w-5 h-5 text-white/70" />}
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>

        {/* Hint text */}
        {cameraReady && !hasResults && (
          <div
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{ bottom: 40, zIndex: 20 }}
          >
            <span
              className="text-xs px-4 py-2 rounded-full text-white/80"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
            >
              {mode === "barcode" ? "Point at barcode to scan automatically" :
               mode === "food" ? "Point at your meal and tap capture" :
               mode === "label" ? "Point at a nutrition label and tap capture" :
               "Select a photo from your library"}
            </span>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="flex-shrink-0"
        style={{
          background: "#0a0a0a",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Results sheet */}
        {hasResults && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {renderResultSheet()}
          </div>
        )}

        {/* Mode tabs + capture button */}
        <div className="px-5 py-4 space-y-4">
          {/* Capture button row — only for food/label modes */}
          {(mode === "food" || mode === "label") && !scanResult && (
            <div className="flex justify-center">
              <button
                onClick={captureFrame}
                disabled={!cameraReady || capturing}
                className="relative w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "#fff" }}
              >
                <div className="w-11 h-11 rounded-full" style={{ background: capturing ? "rgba(255,255,255,0.3)" : "#fff" }} />
              </button>
            </div>
          )}

          {/* Mode selector pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {MODES.map(m => {
              const isActive = mode === m.key || (mode === "library" && m.key === "library");
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    if (m.key === "library") {
                      // open library picker without switching mode
                      libraryInputRef.current?.click();
                    } else {
                      switchMode(m.key);
                    }
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.09)",
                    color: isActive ? "#0a0a0a" : "rgba(255,255,255,0.75)",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {m.key === "library" ? <Image className="w-3.5 h-3.5" /> : <span style={{ fontSize: 14 }}>{m.emoji}</span>}
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden library input */}
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLibraryFile}
      />

      {/* Paywall nodes */}
      {barcodePaywall}
      {mealScanPaywall}
    </div>
  );
}
