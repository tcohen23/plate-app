/**
 * ScannerPage — Fullscreen calai-style scanner
 *
 * Modes:
 *  food     — Fullscreen camera → tap capture → AI meal analysis
 *  barcode  — Fullscreen camera → auto-detect barcode → lookup product
 *  label    — Fullscreen camera → tap capture → AI food-label analysis
 * URL: /scanner?mode=food|barcode|label
 *
 * Quick Actions → Barcode Scan: /scanner?mode=barcode
 * Quick Actions → Meal Scan:    /scanner?mode=food
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { ArrowLeft, Zap, ZapOff, Loader2 } from "lucide-react";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { trackBarcodeScanned, trackFoodLogged } from "@/lib/posthog";
import { getLocalDateString } from "@/lib/dateUtils";
import { usePaywall } from "@/components/PaywallModal";
import { useAccessLevel } from "@/components/RequireSubscription";
import { calculateHealthScore } from "@/lib/healthScore";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScanMode = "food" | "barcode" | "label";

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
  // Retry up to 3 times with backoff — handles transient network errors
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 600));
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        if (res.status >= 500) { lastErr = new Error(`Server error ${res.status}`); continue; }
        return { found: false, barcode: code };
      }
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
    } catch (err) {
      lastErr = err;
    }
  }
  // All retries exhausted
  throw lastErr ?? new Error("Network error");
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
  // html5-qrcode instance for iOS Safari fallback
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Convex
  const localDate = getLocalDateString();
  const analyzeFoodImage = useAction(api.viktorTools.analyzeFoodImage);
  const logFood = useMutation(api.foodLogs.logFood);

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
    // Clean up html5-qrcode instance
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current = null;
    }
    const hiddenDiv = document.getElementById("__html5qrcode_hidden");
    if (hiddenDiv) hiddenDiv.remove();
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

  // ── Handle barcode found ──────────────────────────────────────────────────

  const handleBarcodeFound = useCallback(async (code: string) => {
    setScanning(true);
    try {
      const result = await lookupBarcode(code);
      trackBarcodeScanned(!!result.found, code);
      setBarcodeResult(result);
    } catch (err: any) {
      // Network error (all retries failed) — allow user to try again
      trackBarcodeScanned(false, code);
      toast.error("Network error looking up barcode. Check your connection and try again.");
      // Reset so scanning can restart
      barcodeHandledRef.current = false;
    } finally {
      setScanning(false);
    }
  }, []);

  // ── Barcode detection loop ────────────────────────────────────────────────

  // ── html5-qrcode fallback barcode detection (iOS Safari / unsupported browsers) ──
  const startFallbackBarcodeDetection = useCallback(() => {
    // Create a hidden div for html5-qrcode (it needs a DOM node to initialize)
    let hiddenDiv = document.getElementById("__html5qrcode_hidden");
    if (!hiddenDiv) {
      hiddenDiv = document.createElement("div");
      hiddenDiv.id = "__html5qrcode_hidden";
      hiddenDiv.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(hiddenDiv);
    }

    if (!html5QrcodeRef.current) {
      html5QrcodeRef.current = new Html5Qrcode("__html5qrcode_hidden", {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
      });
    }

    const scanner = html5QrcodeRef.current;

    const detectFromCanvas = async () => {
      if (barcodeHandledRef.current || !videoRef.current || !cameraReady) return;
      try {
        const video = videoRef.current;
        if (video.readyState < 2) return;
        const canvas = document.createElement("canvas");
        const srcW = video.videoWidth;
        const srcH = video.videoHeight;
        canvas.width = srcW;
        canvas.height = srcH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, srcW, srcH);

        // Convert canvas to blob → File for html5-qrcode
        const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.85));
        const file = new File([blob], "frame.jpg", { type: "image/jpeg" });

        const result = await scanner.scanFileV2(file, false);
        if (result?.decodedText && !barcodeHandledRef.current) {
          barcodeHandledRef.current = true;
          hapticMedium();
          if (barcodeDetectionRef.current) {
            clearInterval(barcodeDetectionRef.current);
            barcodeDetectionRef.current = null;
          }
          await handleBarcodeFound(result.decodedText);
        }
      } catch { /* no barcode in frame — keep scanning */ }
    };

    barcodeDetectionRef.current = setInterval(detectFromCanvas, 400);
  }, [cameraReady, handleBarcodeFound]);

  const startBarcodeDetection = useCallback(() => {
    barcodeHandledRef.current = false;
    const hasBarcodeDetector = "BarcodeDetector" in window;

    if (hasBarcodeDetector) {
      // ── Native BarcodeDetector (Chrome/Android) ──────────────────────────
      let detector: any;
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code", "data_matrix"],
        });
      } catch {
        // BarcodeDetector exists but construction failed (unsupported formats on this browser)
        // Fall through to html5-qrcode fallback
        detector = null;
      }

      if (!detector) {
        startFallbackBarcodeDetection();
        return;
      }

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
    } else {
      // ── html5-qrcode fallback (iOS Safari) ──────────────────────────────
      startFallbackBarcodeDetection();
    }
  }, [cameraReady, handleBarcodeFound, startFallbackBarcodeDetection]);

  // ── Capture frame for food/label scan ────────────────────────────────────

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || capturing) return;
    hapticMedium();
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      // Label mode needs higher resolution so text is legible to the AI
      const MAX_W = mode === "label" ? 1920 : 1024;
      const scale = video.videoWidth > MAX_W ? MAX_W / video.videoWidth : 1;
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Higher JPEG quality for label so small text isn't compressed away
      const quality = mode === "label" ? 0.92 : 0.75;
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      setCapturedFrame(dataUrl);
      const items = await analyzeFoodImage({ imageUrl: dataUrl, mode: mode === "label" ? "label" : "food" });
      if ((items as any)?.error === "vision_api_not_configured") {
        toast.error("Scan unavailable. Please try again.");
        setScanResult([]);
      } else {
        const arr = Array.isArray(items) ? items : [];
        setScanResult(arr);
        if (!arr.length) {
          if (mode === "label") {
            toast.info("Couldn't read the label — hold the camera steady and ensure good lighting, then try again.");
          } else {
            toast.info("No food detected. Try a clearer shot.");
          }
        }
      }
    } catch {
      toast.error("Scan failed. Try again.");
      setScanResult([]);
    } finally {
      setCapturing(false);
    }
  }, [analyzeFoodImage, capturing, mode]);

  // ── Log scanned food items ────────────────────────────────────────────────

  const logAllItems = async () => {
    if (!scanResult?.length) return;
    try {
      await Promise.all(
        scanResult.map(item =>
          logFood({
            mealSlot: item.mealSlot || "snack",
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
      // Determine meal slot by time of day (same heuristic used across the app)
      const hour = new Date().getHours();
      const mealSlot = hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 20 ? "dinner" : "snack";
      await logFood({
        mealSlot,
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

    // Stop barcode detection interval if leaving barcode mode
    if (barcodeDetectionRef.current) {
      clearInterval(barcodeDetectionRef.current);
      barcodeDetectionRef.current = null;
    }

    setMode(newMode);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Trigger paywall on entry for non-premium users
  useEffect(() => {
    if (isPremium === false) {
      if (mode === "barcode") openBarcodePaywall();
      else openMealScanPaywall();
    }
  }, [isPremium]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Restart camera if mode changes and camera is not running
  useEffect(() => {
    if (!streamRef.current) {
      startCamera();
    }
  }, [mode]);

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
    if ((mode === "food" || mode === "label") && capturing) {
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
    ((mode === "food" || mode === "label") && (capturing || scanResult !== null));

  const MODES: { key: ScanMode; label: string; emoji: string }[] = [
    { key: "food", label: "Scan food", emoji: "📷" },
    { key: "barcode", label: "Barcode", emoji: "📦" },
    { key: "label", label: "Food label", emoji: "🏷️" },
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
          style={{ display: "block" }}
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
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        )}

        {/* Scan reticle */}
        {cameraReady && !hasResults && (
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
               "Point at a nutrition label and tap capture"}
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
              const isActive = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.09)",
                    color: isActive ? "#0a0a0a" : "rgba(255,255,255,0.75)",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Paywall nodes */}
      {barcodePaywall}
      {mealScanPaywall}
    </div>
  );
}
