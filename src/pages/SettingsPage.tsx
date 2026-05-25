import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";
import { PremiumGate, usePremiumAccess } from "@/components/PremiumGate";
import { ShareBadgeModal } from "@/components/ShareBadgeModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { trackSettingsChanged, trackThemeChanged } from "@/lib/posthog";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import {
  ChevronLeft, ChevronRight, Shield, LogOut, Moon, Sun, Fingerprint, Save,
  Pencil, User, Phone, Ruler, Weight, Calendar, Activity,
  Target, UtensilsCrossed, Pill, Trash2, AlertTriangle, Info, ChevronDown, Heart,
  Camera, DollarSign, Clock, ChefHat, Smile, CheckCircle2 as CheckCircle, X, Share2,
  Crown, ExternalLink, Sparkles, Lock, Mail, Inbox,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getFoodChipsForDiet } from "@/lib/foodChips";
import { isBiometricAvailable, isBiometricEnabled, registerBiometric, disableBiometric } from "@/components/BiometricLock";

/* ── Options (same as onboarding) ── */
const activityOptions = [
  { value: "sedentary", label: "Sedentary", mult: "1.2×", desc: "Office or desk job. You sit most of the day with little to no structured exercise. Best default if you log workouts separately." },
  { value: "light", label: "Lightly Active", mult: "1.375×", desc: "Desk job + 1–3 light workouts per week (walks, yoga, light gym sessions). Or you're on your feet occasionally throughout the day." },
  { value: "moderate", label: "Moderately Active", mult: "1.55×", desc: "Real moderate exercise 3–5 days per week (lifting, running, cycling, sports). Choose this only if you consistently train at moderate intensity." },
  { value: "active", label: "Very Active", mult: "1.725×", desc: "Hard exercise 6–7 days per week. You're an athlete in active training, or you genuinely train hard almost every single day." },
  { value: "very_active", label: "Extra Active", mult: "1.9×", desc: "Physical job + intense training. This is for construction workers, movers, landscapers, farmers, warehouse staff, and similar trades who put real strain on their body all day AND train on top of it." },
];

const goalOptions = [
  { value: "aggressive_cut", label: "Aggressive Cut (−30%)" },
  { value: "moderate_cut", label: "Moderate Cut (−20%)" },
  { value: "light_cut", label: "Light Cut (−10%)" },
  { value: "maintenance", label: "Maintenance" },
  { value: "light_bulk", label: "Light Bulk (+10%)" },
  { value: "moderate_bulk", label: "Moderate Bulk (+20%)" },
  { value: "aggressive_bulk", label: "Aggressive Bulk (+30%)" },
];

const dietOptions = [
  { value: "high_protein", label: "High Protein" },
  { value: "med_high_protein", label: "Med-High Protein" },
  { value: "moderate_protein", label: "Moderate Protein" },
  { value: "low_protein", label: "Low Protein" },
  { value: "balanced", label: "Balanced" },
  { value: "low_carb", label: "Low Carb" },
  { value: "high_carb", label: "High Carb" },
  { value: "low_fat", label: "Low Fat" },
  { value: "keto", label: "Keto" },
  { value: "carnivore", label: "Carnivore" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "paleo", label: "Paleo" },
  { value: "whole30", label: "Whole30" },
  { value: "iifym", label: "IIFYM / Flexible" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
];

/* ── Custom avatars — 180+ options covering diverse people, fitness, culture, memes, and personality ── */
// Each avatar is { emoji, bg, label? } — stored as "emoji:🥑|#A9DFBF" in avatarChoice field
// Categories are defined separately for section headers in the picker
export const AVATAR_SECTIONS: Array<{ label: string; start: number; end: number }> = [
  { label: "People", start: 0, end: 45 },
  { label: "Professions", start: 45, end: 60 },
  { label: "Fitness", start: 60, end: 84 },
  { label: "Sports", start: 84, end: 93 },
  { label: "Food & Nutrition", start: 93, end: 108 },
  { label: "Vibes", start: 108, end: 120 },
  { label: "Animals", start: 120, end: 129 },
  { label: "Culture", start: 129, end: 140 },
  { label: "Meme Zone 🤣", start: 140, end: 999 },
];
export const EMOJI_AVATARS: Array<{ emoji: string; bg: string }> = [
  // ── People: women (light to dark skin tones) ──
  { emoji: "👩🏻", bg: "#FDE8D8" }, { emoji: "👩🏼", bg: "#FDEBD0" }, { emoji: "👩🏽", bg: "#F5CBA7" },
  { emoji: "👩🏾", bg: "#E59866" }, { emoji: "👩🏿", bg: "#784212" },
  // ── People: men (light to dark skin tones) ──
  { emoji: "👨🏻", bg: "#FDE8D8" }, { emoji: "👨🏼", bg: "#FDEBD0" }, { emoji: "👨🏽", bg: "#F5CBA7" },
  { emoji: "👨🏾", bg: "#E59866" }, { emoji: "👨🏿", bg: "#784212" },
  // ── People: older ──
  { emoji: "👴🏻", bg: "#D6EAF8" }, { emoji: "👴🏽", bg: "#A9DFBF" }, { emoji: "👴🏿", bg: "#5D6D7E" },
  { emoji: "👵🏻", bg: "#FADBD8" }, { emoji: "👵🏽", bg: "#F9E4B7" }, { emoji: "👵🏿", bg: "#D7BDE2" },
  // ── People: young ──
  { emoji: "🧒🏻", bg: "#FCF3CF" }, { emoji: "🧒🏽", bg: "#FAD7A0" }, { emoji: "🧒🏿", bg: "#D5DBDB" },
  { emoji: "👦🏻", bg: "#EBF5FB" }, { emoji: "👦🏽", bg: "#A9CCE3" }, { emoji: "👦🏿", bg: "#5D6D7E" },
  { emoji: "👧🏻", bg: "#FDEDEC" }, { emoji: "👧🏽", bg: "#F5B7B1" }, { emoji: "👧🏿", bg: "#D2B4DE" },
  // ── People: diverse hair ──
  { emoji: "👱🏻‍♀️", bg: "#FCF3CF" }, { emoji: "👱🏽‍♀️", bg: "#F9E4B7" }, { emoji: "👱🏻‍♂️", bg: "#FDEBD0" },
  { emoji: "🧔🏻", bg: "#D6DBDF" }, { emoji: "🧔🏽", bg: "#A04000" }, { emoji: "🧔🏿", bg: "#212F3D" },
  { emoji: "👩🏻‍🦱", bg: "#FADBD8" }, { emoji: "👩🏿‍🦱", bg: "#922B21" },
  { emoji: "👩🏻‍🦰", bg: "#FDEBD0" }, { emoji: "👩🏽‍🦰", bg: "#F5CBA7" },
  { emoji: "👩🏻‍🦳", bg: "#EAF4FB" }, { emoji: "👩🏿‍🦳", bg: "#2E4057" },
  { emoji: "👨🏻‍🦲", bg: "#D6EAF8" }, { emoji: "👨🏿‍🦲", bg: "#1A2533" },
  // ── Professions: health & science ──
  { emoji: "🧑🏻‍⚕️", bg: "#D5F5E3" }, { emoji: "🧑🏽‍⚕️", bg: "#A9DFBF" }, { emoji: "🧑🏿‍⚕️", bg: "#1E8449" },
  { emoji: "🧑🏻‍🔬", bg: "#EBF5FB" }, { emoji: "🧑🏽‍🔬", bg: "#AED6F1" }, { emoji: "🧑🏿‍🔬", bg: "#1A5276" },
  // ── Professions: food & athletes ──
  { emoji: "🧑🏻‍🍳", bg: "#FEF9E7" }, { emoji: "🧑🏽‍🍳", bg: "#FAD7A0" }, { emoji: "🧑🏿‍🍳", bg: "#784212" },
  { emoji: "🧑🏻‍🎓", bg: "#F4ECF7" }, { emoji: "🧑🏽‍🎓", bg: "#D7BDE2" }, { emoji: "🧑🏿‍🎓", bg: "#6C3483" },
  { emoji: "🧑🏻‍💻", bg: "#EAFAF1" }, { emoji: "🧑🏽‍💻", bg: "#A9DFBF" }, { emoji: "🧑🏿‍💻", bg: "#196F3D" },
  { emoji: "🧑🏻‍🎨", bg: "#FDEDEC" }, { emoji: "🧑🏽‍🎨", bg: "#F5B7B1" }, { emoji: "🧑🏿‍🎨", bg: "#922B21" },
  { emoji: "🧑🏻‍🚀", bg: "#EBF5FB" }, { emoji: "🧑🏽‍🚀", bg: "#85C1E9" }, { emoji: "🧑🏿‍🚀", bg: "#154360" },
  // ── Fitness activities (diverse skin tones) ──
  { emoji: "🏋️🏻", bg: "#D6EAF8" }, { emoji: "🏋️🏽", bg: "#7FB3D3" }, { emoji: "🏋️🏿", bg: "#1B4F72" },
  { emoji: "🏃🏻‍♀️", bg: "#D5F5E3" }, { emoji: "🏃🏽‍♀️", bg: "#82E0AA" }, { emoji: "🏃🏿‍♀️", bg: "#1E8449" },
  { emoji: "🏃🏻‍♂️", bg: "#EBF5FB" }, { emoji: "🏃🏽‍♂️", bg: "#AED6F1" }, { emoji: "🏃🏿‍♂️", bg: "#154360" },
  { emoji: "🧘🏻‍♀️", bg: "#F9EBEA" }, { emoji: "🧘🏽‍♀️", bg: "#F1948A" }, { emoji: "🧘🏿‍♀️", bg: "#922B21" },
  { emoji: "🤸🏻", bg: "#FCF3CF" }, { emoji: "🤸🏽", bg: "#F9E4B7" }, { emoji: "🤸🏿", bg: "#9A7D0A" },
  { emoji: "🚴🏻", bg: "#D5F5E3" }, { emoji: "🚴🏽", bg: "#A9DFBF" }, { emoji: "🚴🏿", bg: "#196F3D" },
  { emoji: "🏊🏻", bg: "#EBF5FB" }, { emoji: "🏊🏽", bg: "#AED6F1" }, { emoji: "🏊🏿", bg: "#1A5276" },
  { emoji: "🥊", bg: "#F5CBA7" }, { emoji: "🏆", bg: "#F9E4B7" }, { emoji: "⚡", bg: "#FCF3CF" },
  // ── Sports ──
  { emoji: "⚽", bg: "#D5D8DC" }, { emoji: "🏀", bg: "#FAD7A0" }, { emoji: "🏈", bg: "#F5CBA7" },
  { emoji: "🎾", bg: "#ABEBC6" }, { emoji: "🏐", bg: "#EBF5FB" }, { emoji: "🏒", bg: "#D6EAF8" },
  { emoji: "🎱", bg: "#D5D8DC" }, { emoji: "🏓", bg: "#FDEBD0" }, { emoji: "🥋", bg: "#F2F3F4" },
  // ── Food & nutrition ──
  { emoji: "🥑", bg: "#A9DFBF" }, { emoji: "🍎", bg: "#F5B7B1" }, { emoji: "🍋", bg: "#FCF3CF" },
  { emoji: "🍓", bg: "#FADBD8" }, { emoji: "🥦", bg: "#A9DFBF" }, { emoji: "🌽", bg: "#F9E4B7" },
  { emoji: "🍗", bg: "#FDEBD0" }, { emoji: "🥚", bg: "#FEF9E7" }, { emoji: "🥩", bg: "#FADBD8" },
  { emoji: "🍣", bg: "#EAF4FB" }, { emoji: "🥗", bg: "#D5F5E3" }, { emoji: "🌮", bg: "#FAD7A0" },
  { emoji: "🍜", bg: "#FEF9E7" }, { emoji: "🫐", bg: "#D2B4DE" }, { emoji: "🍇", bg: "#C39BD3" },
  // ── Personality & vibe ──
  { emoji: "😎", bg: "#4ECDC4" }, { emoji: "🤩", bg: "#FF6B6B" }, { emoji: "🤠", bg: "#D5DBDB" },
  { emoji: "🥳", bg: "#A8EDEA" }, { emoji: "🤓", bg: "#F7DC6F" }, { emoji: "😏", bg: "#85C1E9" },
  { emoji: "🔥", bg: "#FDEBD0" }, { emoji: "💪🏽", bg: "#E59866" }, { emoji: "👑", bg: "#F9E4B7" },
  { emoji: "💎", bg: "#D6EAF8" }, { emoji: "🚀", bg: "#D6EAF8" }, { emoji: "🌟", bg: "#FCF3CF" },
  // ── Animals ──
  { emoji: "🦁", bg: "#F9E4B7" }, { emoji: "🐯", bg: "#F5CBA7" }, { emoji: "🐺", bg: "#D6DBDF" },
  { emoji: "🦊", bg: "#FDEBD0" }, { emoji: "🐸", bg: "#A9DFBF" }, { emoji: "🦋", bg: "#E8DAEF" },
  { emoji: "🐉", bg: "#A3E4D7" }, { emoji: "🦄", bg: "#F9EBEA" }, { emoji: "🐬", bg: "#AED6F1" },
  // ── Culture ──
  { emoji: "🧕🏻", bg: "#FDE8D8" }, { emoji: "🧕🏽", bg: "#F5CBA7" }, { emoji: "🧕🏿", bg: "#784212" },
  { emoji: "👲🏻", bg: "#FCF3CF" }, { emoji: "👲🏽", bg: "#E59866" },
  { emoji: "🙎🏻‍♂️", bg: "#D6EAF8" }, { emoji: "🙎🏿‍♀️", bg: "#922B21" },
  { emoji: "🧑🏻‍🦽", bg: "#EBF5FB" }, { emoji: "🧑🏿‍🦽", bg: "#1B2631" },
  { emoji: "🤰🏻", bg: "#FDEBD0" }, { emoji: "🤰🏽", bg: "#F5CBA7" },
  // ── Meme Zone 🤣 ──
  { emoji: "🐸", bg: "#2ECC71" },        // Pepe vibes
  { emoji: "💀", bg: "#2C3E50" },        // skull = "💀💀💀"
  { emoji: "🗿", bg: "#BDC3C7" },        // moai stone face
  { emoji: "👁️👄👁️", bg: "#1A1A2E" },  // eyes mouth eyes
  { emoji: "🤡", bg: "#FADBD8" },        // clown world
  { emoji: "👺", bg: "#C0392B" },        // goblin rage
  { emoji: "😤", bg: "#E74C3C" },        // chad energy
  { emoji: "🧠", bg: "#F5EEF8" },        // big brain
  { emoji: "🥴", bg: "#F8C471" },        // woozy
  { emoji: "😭", bg: "#AED6F1" },        // crying laughing
  { emoji: "🤌", bg: "#FAD7A0" },        // Italian gesture
  { emoji: "💅", bg: "#F1948A" },        // unbothered
  { emoji: "🫡", bg: "#AED6F1" },        // salute
  { emoji: "🪬", bg: "#85C1E9" },        // evil eye amulet
  { emoji: "🕺🏽", bg: "#A9DFBF" },      // disco guy
  { emoji: "🫠", bg: "#A3E4D7" },        // melting face
  { emoji: "🤯", bg: "#FDEBD0" },        // mind blown
  { emoji: "🐀", bg: "#D7DBDD" },        // ratatouille / rat king
  { emoji: "🦆", bg: "#A9DFBF" },        // quack
  { emoji: "🦧", bg: "#FAD7A0" },        // ape / ape strong
  { emoji: "🦖", bg: "#82E0AA" },        // dino
  { emoji: "👀", bg: "#F0F3F4" },        // eyes watching
  { emoji: "🙈", bg: "#F9E4B7" },        // see no evil monkey
  { emoji: "🙉", bg: "#FDEBD0" },        // hear no evil monkey
  { emoji: "🙊", bg: "#FADBD8" },        // speak no evil monkey
  { emoji: "🤙🏽", bg: "#58D68D" },      // shaka / hang loose
  { emoji: "🫶🏽", bg: "#F1948A" },      // heart hands
  { emoji: "👾", bg: "#9B59B6" },        // alien pixel
  { emoji: "🤖", bg: "#5DADE2" },        // robot
  { emoji: "🧌", bg: "#27AE60" },        // troll
  { emoji: "🫃", bg: "#F5CBA7" },        // pregnant man
  { emoji: "🪄", bg: "#D2B4DE" },        // magic wand
  { emoji: "🎭", bg: "#1ABC9C" },        // theater masks
  { emoji: "🎰", bg: "#E74C3C" },        // slot machine
  { emoji: "🎪", bg: "#F39C12" },        // circus tent
  { emoji: "🍕", bg: "#FDEBD0" },        // pizza rat / pizza lover
  { emoji: "🌯", bg: "#A9DFBF" },        // burrito wrap
  { emoji: "🥤", bg: "#AED6F1" },        // big gulp / hydration
];

/** Returns a CSS-renderable avatar key: "emoji|bg" — no external URL needed */
function getAvatarKey(idx: number): string {
  const a = EMOJI_AVATARS[idx % EMOJI_AVATARS.length];
  return `emoji:${a.emoji}|${a.bg}`;
}

/** Parse an avatarChoice value — handles both legacy DiceBear URLs and new emoji keys */
export function parseAvatarChoice(choice: string | undefined): { type: "emoji"; emoji: string; bg: string } | { type: "url"; url: string } | null {
  if (!choice) return null;
  if (choice.startsWith("emoji:")) {
    const rest = choice.slice(6);
    const [emoji, bg] = rest.split("|");
    return { type: "emoji", emoji, bg };
  }
  return { type: "url", url: choice };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.getProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const isAdmin = useQuery(api.admin.isAdmin);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const updateProfilePicture = useMutation(api.profiles.updateProfilePicture);
  const profilePictureUrl = useQuery(api.profiles.getProfilePictureUrl);
  const setAvatarChoice = useMutation(api.profiles.setAvatarChoice);
  const { signOut } = useAuthActions();
  const { theme, preference, setPreference } = useTheme();

  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showShareBadge, setShowShareBadge] = useState(false);
  const [_showAvatarUpgrade, _setShowAvatarUpgrade] = useState(false);
  const hasPremiumForAvatar = usePremiumAccess();

  // Premium avatar indices — these correspond to special AI-generated images in the avatar picker
  // Free users see them with lock overlay and get an upgrade prompt on tap
  // Currently no emoji are gated — premium image avatars will use URL-based avatarChoice values
  const PREMIUM_AVATAR_INDICES = new Set<number>([]);
  const stats = useQuery(api.progress.getUserStats, {});
  const emailHistory = useQuery(api.admin.getMyEmailHistory);
  const [showMailSection, setShowMailSection] = useState(false);
  const [editCooking, setEditCooking] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editMaxCookTime, setEditMaxCookTime] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvail);
  }, []);

  // Edit state for each field
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHeightFt, setEditHeightFt] = useState("");
  const [editHeightIn, setEditHeightIn] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const [editDiet, setEditDiet] = useState("");
  const [editGlp1, setEditGlp1] = useState(false);
  const [editUnits, setEditUnits] = useState("");
  const [showActivityHelp, setShowActivityHelp] = useState(false);
  const [editFavorites, setEditFavorites] = useState<string[]>([]);
  const [editDislikes, setEditDislikes] = useState<string[]>([]);

  if (!profile) {
    return (
      <div className="px-5 pt-5 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  const startEdit = (field: string) => {
    setEditing(field);
    switch (field) {
      case "name":
        setEditName(profile.name || "");
        setEditLastName(profile.lastName || "");
        break;
      case "phone":
        setEditPhone(profile.phone || "");
        break;
      case "weight":
        setEditWeight(String(profile.weight || ""));
        break;
      case "height":
        setEditHeightFt(String(Math.floor((profile.height || 70) / 12)));
        setEditHeightIn(String((profile.height || 70) % 12));
        break;
      case "age":
        setEditAge(String(profile.age || ""));
        break;
      case "gender":
        setEditGender(profile.gender || "male");
        break;
      case "goal":
        setEditGoal(profile.goal || "maintenance");
        break;
      case "activity":
        setEditActivity(profile.activityLevel || "moderate");
        break;
      case "diet":
        setEditDiet(profile.dietPreference || "balanced");
        break;
      case "glp1":
        setEditGlp1(profile.usesGlp1 || false);
        break;
      case "units":
        setEditUnits(profile.units || "imperial");
        break;
      case "favorites":
        setEditFavorites((profile as any).favoriteFoods || []);
        setEditDislikes((profile as any).dislikedFoods || []);
        break;
      case "cooking":
        setEditCooking((profile as any).cookingPreference || "moderate");
        break;
      case "budget":
        setEditBudget((profile as any).budgetLevel || "medium");
        break;
      case "maxCookTime":
        setEditMaxCookTime((profile as any).maxCookTime ? String((profile as any).maxCookTime) : "");
        break;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await updateProfilePicture({ storageId });
      toast.success("Profile photo updated.");
    } catch {
      toast.error("Couldn't upload photo. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectAvatar = async (idx: number) => {
    const key = getAvatarKey(idx);
    try {
      await setAvatarChoice({ avatarUrl: key });
      toast.success("Avatar updated.");
      setShowAvatarPicker(false);
    } catch {
      toast.error("Couldn't save avatar. Try again.");
    }
  };

  const saveField = async (field: string) => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      switch (field) {
        case "name":
          updates.name = editName;
          updates.lastName = editLastName;
          break;
        case "phone":
          updates.phone = editPhone;
          break;
        case "weight":
          updates.weight = parseFloat(editWeight);
          break;
        case "height":
          updates.height = (parseInt(editHeightFt) || 0) * 12 + (parseInt(editHeightIn) || 0);
          break;
        case "age":
          updates.age = parseInt(editAge);
          break;
        case "gender":
          updates.gender = editGender;
          break;
        case "goal":
          updates.goal = editGoal;
          break;
        case "activity":
          updates.activityLevel = editActivity;
          break;
        case "diet":
          updates.dietPreference = editDiet;
          break;
        case "glp1":
          updates.usesGlp1 = editGlp1;
          break;
        case "units":
          updates.units = editUnits;
          break;
        case "favorites":
          updates.favoriteFoods = editFavorites;
          updates.dislikedFoods = editDislikes;
          break;
        case "cooking":
          updates.cookingPreference = editCooking;
          break;
        case "budget":
          updates.budgetLevel = editBudget;
          break;
        case "maxCookTime":
          updates.maxCookTime = editMaxCookTime.trim() === "" ? undefined : (parseInt(editMaxCookTime) || undefined);
          break;
      }
      hapticMedium();
      await updateProfile(updates);
      hapticSuccess();
      trackSettingsChanged(editing || "unknown");
      toast.success("Plan updated.");
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const heightFt = Math.floor((profile.height || 70) / 12);
  const heightIn = (profile.height || 70) % 12;

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-serif">Account</h1>

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl pb-8 flex flex-col"
            style={{ background: "var(--background)", maxHeight: "82vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header — always visible while scrolling */}
            <div
              className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 z-10 rounded-t-2xl"
              style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="text-lg font-serif">Choose an avatar</h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pt-4 overflow-y-auto flex-1">
            <p className="text-sm text-muted-foreground mb-4">Tap any avatar to set it as your profile picture.</p>
            {AVATAR_SECTIONS.map((section) => {
              const sectionAvatars = EMOJI_AVATARS.slice(section.start, section.end);
              if (sectionAvatars.length === 0) return null;
              return (
                <div key={section.label} className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{section.label}</p>
                  <div className="grid grid-cols-5 gap-3">
                    {sectionAvatars.map((av, relIdx) => {
                      const idx = section.start + relIdx;
                      const key = getAvatarKey(idx);
                      const isSelected = (profile as any).avatarChoice === key;
                      const isPremiumAvatar = PREMIUM_AVATAR_INDICES.has(idx);
                      const canUse = !isPremiumAvatar || hasPremiumForAvatar;
                      return (
                        <button
                          key={idx}
                          onClick={() => canUse ? handleSelectAvatar(idx) : _setShowAvatarUpgrade(true)}
                          className="relative w-full aspect-square rounded-2xl flex items-center justify-center border-2 transition-all active:scale-95"
                          style={{
                            borderColor: isSelected ? "#52B788" : "transparent",
                            background: av.bg,
                            fontSize: "1.75rem",
                            opacity: isPremiumAvatar && !canUse ? 0.7 : 1,
                          }}
                        >
                          {av.emoji}
                          {isSelected && (
                            <div className="absolute bottom-0.5 right-0.5">
                              <CheckCircle className="w-3.5 h-3.5" style={{ color: "#52B788" }} />
                            </div>
                          )}
                          {isPremiumAvatar && !canUse && (
                            <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
                              <Lock className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="pb-4" />
            </div>{/* end scrollable inner */}
          </div>
        </div>
      )}

      {/* Profile Card */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center gap-4">
          {/* Profile photo / avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden">
              {(() => {
                if (profilePictureUrl) return <img src={profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />;
                const parsed = parseAvatarChoice((profile as any).avatarChoice);
                if (parsed?.type === "emoji") return (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-3xl" style={{ background: parsed.bg }}>
                    {parsed.emoji}
                  </div>
                );
                if (parsed?.type === "url") return <img src={parsed.url} alt="Avatar" className="w-full h-full p-1" />;
                return <span className="text-2xl font-serif text-primary-foreground">{(profile.name || "U")[0].toUpperCase()}</span>;
              })()}
            </div>
            {/* Camera button for real photo */}
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <Camera className="w-3 h-3 text-primary-foreground" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-lg truncate">{profile.name}{profile.lastName ? ` ${profile.lastName}` : ""}</div>
            <div className="text-sm text-muted-foreground truncate">
              {profile.height ? `${heightFt}'${heightIn}" · ` : ""}{profile.weight} lbs · {profile.age}y
            </div>
            {uploadingPhoto && <div className="text-xs text-muted-foreground mt-1">Uploading photo…</div>}
            {/* Avatar picker trigger */}
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "#52B788" }}
            >
              <Smile className="w-3.5 h-3.5" />
              {(profile as any).avatarChoice ? "Change avatar" : "Choose an avatar"}
            </button>
          </div>
        </div>
      </Card>

      {/* Daily Targets Card */}
      <Card className="p-4 rounded-xl">
        <div className="label-uppercase text-muted-foreground mb-3">Daily Targets</div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xl font-serif">{profile.targetCalories}</div>
            <div className="label-uppercase text-muted-foreground">kcal</div>
          </div>
          <div>
            <div className="text-xl font-serif text-blue-600">{profile.targetProtein}g</div>
            <div className="label-uppercase text-muted-foreground">protein</div>
          </div>
          <div>
            <div className="text-xl font-serif text-amber-600">{profile.targetCarbs}g</div>
            <div className="label-uppercase text-muted-foreground">carbs</div>
          </div>
          <div>
            <div className="text-xl font-serif text-red-500">{profile.targetFat}g</div>
            <div className="label-uppercase text-muted-foreground">fat</div>
          </div>
        </div>
      </Card>

      {/* ── Profile ── */}
      <SectionLabel label="Profile" />

      <EditableRow
        icon={<User className="w-4 h-4" />}
        label="Name"
        value={`${profile.name || ""}${profile.lastName ? ` ${profile.lastName}` : ""}`}
        isEditing={editing === "name"}
        onEdit={() => startEdit("name")}
        onSave={() => saveField("name")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="space-y-2">
          <Input placeholder="First name" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 rounded-lg" />
          <Input placeholder="Last name (optional)" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-10 rounded-lg" />
        </div>
      </EditableRow>

      <EditableRow
        icon={<Phone className="w-4 h-4" />}
        label="Phone"
        value={profile.phone || "Not set"}
        isEditing={editing === "phone"}
        onEdit={() => startEdit("phone")}
        onSave={() => saveField("phone")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <Input type="tel" placeholder="+1 (555) 000-0000" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-10 rounded-lg" />
      </EditableRow>

      {/* ── Body Stats ── */}
      <SectionLabel label="Body Stats" />

      <EditableRow
        icon={<Weight className="w-4 h-4" />}
        label="Weight"
        value={`${profile.weight} lbs`}
        isEditing={editing === "weight"}
        onEdit={() => startEdit("weight")}
        onSave={() => saveField("weight")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <Input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="h-10 rounded-lg" />
      </EditableRow>

      <EditableRow
        icon={<Ruler className="w-4 h-4" />}
        label="Height"
        value={`${heightFt}'${heightIn}"`}
        isEditing={editing === "height"}
        onEdit={() => startEdit("height")}
        onSave={() => saveField("height")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-muted-foreground">Feet</span>
            <Input type="number" value={editHeightFt} onChange={(e) => setEditHeightFt(e.target.value)} className="h-10 rounded-lg" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Inches</span>
            <Input type="number" value={editHeightIn} onChange={(e) => setEditHeightIn(e.target.value)} className="h-10 rounded-lg" />
          </div>
        </div>
      </EditableRow>

      <EditableRow
        icon={<Calendar className="w-4 h-4" />}
        label="Age"
        value={`${profile.age}`}
        isEditing={editing === "age"}
        onEdit={() => startEdit("age")}
        onSave={() => saveField("age")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <Input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} className="h-10 rounded-lg" />
      </EditableRow>

      <EditableRow
        icon={<User className="w-4 h-4" />}
        label="Sex"
        value={profile.gender === "male" ? "Male" : "Female"}
        isEditing={editing === "gender"}
        onEdit={() => startEdit("gender")}
        onSave={() => saveField("gender")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="grid grid-cols-2 gap-2">
          {["male", "female"].map((g) => (
            <button
              key={g}
              onClick={() => setEditGender(g)}
              className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${
                editGender === g
                  ? "border-foreground bg-primary/5"
                  : "border-border bg-card hover:border-foreground/20"
              }`}
            >
              {g === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </EditableRow>

      {/* ── Goals & Preferences ── */}
      <SectionLabel label="Goals & Preferences" />

      <EditableRow
        icon={<Target className="w-4 h-4" />}
        label="Goal"
        value={goalOptions.find((o) => o.value === profile.goal)?.label || profile.goal}
        isEditing={editing === "goal"}
        onEdit={() => startEdit("goal")}
        onSave={() => saveField("goal")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <select value={editGoal} onChange={(e) => setEditGoal(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
          {goalOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </EditableRow>

      <EditableRow
        icon={<Activity className="w-4 h-4" />}
        label="Activity Level"
        value={activityOptions.find((o) => o.value === profile.activityLevel)?.label || profile.activityLevel}
        isEditing={editing === "activity"}
        onEdit={() => startEdit("activity")}
        onSave={() => saveField("activity")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="space-y-2">
          {/* Info banner */}
          <div className="flex gap-2.5 p-3 rounded-xl bg-[hsl(var(--accent))]/40 border border-[hsl(var(--border))]/50">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Pick honestly — your calories depend on it</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Most people overestimate their activity level. When in doubt, choose Sedentary or Lightly Active and log your workouts separately for more accurate calorie targets.</p>
            </div>
          </div>
          {activityOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setEditActivity(o.value)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${editActivity === o.value ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20" : "border-border bg-card hover:border-foreground/30"}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{o.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{o.mult}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{o.desc}</p>
            </button>
          ))}
          {/* Help me decide */}
          <button
            type="button"
            onClick={() => setShowActivityHelp(!showActivityHelp)}
            className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showActivityHelp ? "rotate-180" : ""}`} />
            <span>Not sure which to pick?</span>
          </button>
          {showActivityHelp && (
            <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-3 animate-fade-up">
              <p className="font-medium text-foreground text-sm">A simple test:</p>
              <div className="space-y-2">
                <div><p className="font-medium text-foreground">Do you work a desk/office job?</p><p>→ Start with Sedentary or Lightly Active — even if you work out hard at the gym</p></div>
                <div><p className="font-medium text-foreground">Are you on your feet most of the workday?</p><p className="text-muted-foreground/70">(teacher, nurse, retail, server, etc.)</p><p>→ Lightly Active or Moderately Active</p></div>
                <div><p className="font-medium text-foreground">Is your job physically demanding all day?</p><p className="text-muted-foreground/70">(construction, landscaping, warehouse, trades)</p><p>→ Very Active or Extra Active</p></div>
              </div>
              <div className="pt-2 border-t border-border space-y-2">
                <p className="leading-relaxed">If you log your workouts in Plate (or use a wearable), pick a <span className="font-medium text-foreground">lower</span> activity level — your training calories get added on top automatically.</p>
                <p className="leading-relaxed">When in doubt, pick lower. It's easier to add calories if you're losing weight too fast than to fix months of slow progress because you overshot your target.</p>
              </div>
            </div>
          )}
        </div>
      </EditableRow>

      <EditableRow
        icon={<UtensilsCrossed className="w-4 h-4" />}
        label="Diet Style"
        value={dietOptions.find((o) => o.value === profile.dietPreference)?.label || profile.dietPreference || "Balanced"}
        isEditing={editing === "diet"}
        onEdit={() => startEdit("diet")}
        onSave={() => saveField("diet")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <select value={editDiet} onChange={(e) => setEditDiet(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
          {dietOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </EditableRow>

      <EditableRow
        icon={<Heart className="w-4 h-4" />}
        label="Favorite & Excluded Foods"
        value={(() => {
          const favs = ((profile as any).favoriteFoods || []) as string[];
          const disls = ((profile as any).dislikedFoods || []) as string[];
          if (favs.length === 0 && disls.length === 0) return "None set";
          const parts = [];
          if (favs.length > 0) parts.push(`${favs.length} favorite${favs.length > 1 ? "s" : ""}`);
          if (disls.length > 0) parts.push(`${disls.length} excluded`);
          return parts.join(", ");
        })()}
        isEditing={editing === "favorites"}
        onEdit={() => startEdit("favorites")}
        onSave={() => saveField("favorites")}
        onCancel={() => setEditing(null)}
        saving={saving}
        preview={(() => {
          const favs = ((profile as any).favoriteFoods || []) as string[];
          const disls = ((profile as any).dislikedFoods || []) as string[];
          if (favs.length === 0 && disls.length === 0) return undefined;
          return (
            <div className="space-y-1.5 mt-1">
              {favs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {favs.map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/40 bg-emerald-950/30 text-emerald-400">♥ {f}</span>
                  ))}
                </div>
              )}
              {disls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {disls.map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-red-500/40 bg-red-950/30 text-red-400">✕ {f}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      >
        {editing === "favorites" && (
        <div className="space-y-5">
          {/* Favorites section */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Foods I love (scoring boost)</label>

            {/* Currently selected favorites */}
            {editFavorites.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {editFavorites.map((f) => (
                  <button key={f} onClick={() => setEditFavorites(prev => prev.filter(x => x !== f))} className="px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/50 transition-all hover:opacity-70">
                    ✓ {f} ×
                  </button>
                ))}
              </div>
            )}

            {/* Bubble chip options by category */}
            {getFoodChipsForDiet(profile.dietPreference || "balanced").map((group) => (
              <div key={group.category} className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{group.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.foods.filter(f => !editFavorites.includes(f.toLowerCase()) && !editDislikes.includes(f.toLowerCase())).map((food) => (
                    <button
                      key={food}
                      onClick={() => {
                        setEditFavorites(prev => [...prev, food.toLowerCase()]);
                        setEditDislikes(prev => prev.filter(x => x !== food.toLowerCase()));
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:border-emerald-400/50 hover:bg-emerald-950/20 transition-all"
                    >
                      {food}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom input */}
            <Input placeholder="Add something else… press Enter" className="text-sm h-9 mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (val && !editFavorites.includes(val)) {
                    setEditFavorites(prev => [...prev, val]);
                    setEditDislikes(prev => prev.filter(x => x !== val));
                  }
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>

          {/* Dislikes section */}
          <div className="space-y-3 pt-3 border-t border-border">
            <label className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">Foods I'm not into (hard exclusion)</label>

            {/* Currently excluded */}
            {editDislikes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {editDislikes.map((f) => (
                  <button key={f} onClick={() => setEditDislikes(prev => prev.filter(x => x !== f))} className="px-3 py-1.5 rounded-full text-xs font-medium border border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 dark:border-red-500/50 transition-all hover:opacity-70">
                    ✕ {f} ×
                  </button>
                ))}
              </div>
            )}

            {/* Bubble chip options for exclusion - same pools, not yet favorite or excluded */}
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(getFoodChipsForDiet(profile.dietPreference || "balanced").flatMap(g => g.foods))]
                .filter(f => !editFavorites.includes(f.toLowerCase()) && !editDislikes.includes(f.toLowerCase()))
                .map((food) => (
                  <button
                    key={food}
                    onClick={() => {
                      setEditDislikes(prev => [...prev, food.toLowerCase()]);
                      setEditFavorites(prev => prev.filter(x => x !== food.toLowerCase()));
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-border/60 bg-card/50 hover:border-red-400/50 hover:bg-red-950/20 text-muted-foreground transition-all"
                  >
                    {food}
                  </button>
              ))}
            </div>

            {/* Custom exclusion input */}
            <Input placeholder="Exclude something else… press Enter" className="text-sm h-9 mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (val && !editDislikes.includes(val)) {
                    setEditDislikes(prev => [...prev, val]);
                    setEditFavorites(prev => prev.filter(x => x !== val));
                  }
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">Saving will regenerate your meal plan.</p>
        </div>
        )}
      </EditableRow>

      <Glp1Row profile={profile} editing={editing} startEdit={startEdit} saveField={saveField} setEditing={setEditing} saving={saving} editGlp1={editGlp1} setEditGlp1={setEditGlp1} />

      {/* ── Cooking Preferences ── */}
      <SectionLabel label="Cooking Preferences" />

      <EditableRow
        icon={<ChefHat className="w-4 h-4" />}
        label="Cooking Level"
        value={(({ none: "No Cooking", minimal: "Minimal", moderate: "Moderate", advanced: "Advanced" } as Record<string, string>)[(profile as any).cookingPreference || "moderate"]) || "Moderate"}
        isEditing={editing === "cooking"}
        onEdit={() => startEdit("cooking")}
        onSave={() => saveField("cooking")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "none", label: "No Cooking", desc: "Ready-to-eat only" },
            { value: "minimal", label: "Minimal", desc: "Simple prep, no skill needed" },
            { value: "moderate", label: "Moderate", desc: "Comfortable in the kitchen" },
            { value: "advanced", label: "Advanced", desc: "Any recipe, any time" },
          ].map((o) => (
            <button
              key={o.value}
              onClick={() => setEditCooking(o.value)}
              className={`p-2.5 rounded-lg text-sm font-medium border transition-all text-left ${editCooking === o.value ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"}`}
            >
              <div>{o.label}</div>
              <div className="text-xs text-muted-foreground font-normal">{o.desc}</div>
            </button>
          ))}
        </div>
      </EditableRow>

      <EditableRow
        icon={<DollarSign className="w-4 h-4" />}
        label="Budget"
        value={(({ low: "Budget ($)", medium: "Mid-range ($$)", high: "No limit ($$$)" } as Record<string, string>)[(profile as any).budgetLevel || "medium"]) || "Mid-range"}
        isEditing={editing === "budget"}
        onEdit={() => startEdit("budget")}
        onSave={() => saveField("budget")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "low", label: "Budget", sub: "$" },
            { value: "medium", label: "Mid-range", sub: "$$" },
            { value: "high", label: "No limit", sub: "$$$" },
          ].map((o) => (
            <button
              key={o.value}
              onClick={() => setEditBudget(o.value)}
              className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${editBudget === o.value ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"}`}
            >
              <div>{o.sub}</div>
              <div className="text-xs text-muted-foreground font-normal">{o.label}</div>
            </button>
          ))}
        </div>
      </EditableRow>

      <EditableRow
        icon={<Clock className="w-4 h-4" />}
        label="Max Cook Time"
        value={(profile as any).maxCookTime ? `${(profile as any).maxCookTime} minutes` : "Any time"}
        isEditing={editing === "maxCookTime"}
        onEdit={() => startEdit("maxCookTime")}
        onSave={() => saveField("maxCookTime")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {["15", "30", "45", "60"].map((t) => (
              <button
                key={t}
                onClick={() => setEditMaxCookTime(t)}
                className={`p-2 rounded-lg text-sm font-medium border transition-all ${editMaxCookTime === t ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"}`}
              >
                {t}m
              </button>
            ))}
            <button
              onClick={() => setEditMaxCookTime("")}
              className={`p-2 rounded-lg text-sm font-medium border transition-all ${editMaxCookTime === "" ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"}`}
            >
              Any
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Or enter custom:</span>
            <Input
              type="number"
              value={editMaxCookTime}
              onChange={(e) => setEditMaxCookTime(e.target.value)}
              className="h-8 w-24 text-sm"
              placeholder="any"
            />
          </div>
        </div>
      </EditableRow>

      {/* ── App Settings ── */}
      <SectionLabel label="App Settings" />

      {/* Units toggle */}
      <Card className="p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4" />
          <span className="text-sm font-medium">Units</span>
        </div>
        <div className="flex bg-muted rounded-lg overflow-hidden">
          <button
            onClick={() => updateProfile({ units: "imperial" }).then(() => toast.success("Units updated"))}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              (profile.units || "imperial") === "imperial"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Imperial
          </button>
          <button
            onClick={() => updateProfile({ units: "metric" }).then(() => toast.success("Units updated"))}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              profile.units === "metric"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Metric
          </button>
        </div>
      </Card>

      {/* Toast notifications toggle */}
      <Card className="p-4 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">In-app notifications</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">Show pop-up updates at the bottom of the screen. Swipe down to dismiss.</p>
        </div>
        <button
          onClick={() => {
            const current = (profile as any).toastNotifications !== false;
            updateProfile({ toastNotifications: !current }).then(() =>
              toast.success(!current ? "Notifications on" : "Notifications off")
            );
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            (profile as any).toastNotifications !== false ? "bg-green-600" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              (profile as any).toastNotifications !== false ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </Card>

      {/* Theme toggle — 3-way */}
      <Card className="p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span className="text-sm font-medium">Theme</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["dark", "cream", "system"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => { (setPreference as any)?.(opt); trackThemeChanged(opt); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all tap-scale ${
                (preference as any) === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {opt === "dark" ? "Pure Black" : opt === "cream" ? "Cream" : "System"}
            </button>
          ))}
        </div>
      </Card>

      {/* Biometric lock */}
      {biometricAvail && (
        <Card className="p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            <div>
              <span className="text-sm font-medium">Face ID / Biometric Lock</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Require biometric to open the app</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (biometricOn) {
                disableBiometric();
                setBiometricOn(false);
                toast.success("Biometric lock disabled");
              } else {
                const success = await registerBiometric(profile.name || "User");
                if (success) {
                  setBiometricOn(true);
                  toast.success("Face ID enabled!");
                } else {
                  toast.error("Biometric setup failed.");
                }
              }
            }}
            className={`w-12 h-7 rounded-full transition-all ${biometricOn ? "bg-primary" : "bg-muted"} relative`}
          >
            <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all ${biometricOn ? "left-[22px]" : "left-[3px]"}`} />
          </button>
        </Card>
      )}

      {/* Admin access */}
      {isAdmin && (
        <Card
          className="p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => navigate("/admin")}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Admin Dashboard</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        </Card>
      )}

      {/* Privacy Policy link */}
      <button
        onClick={() => navigate("/privacy")}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-1 underline underline-offset-2"
      >
        Privacy Policy
      </button>

      {/* Share Plate */}
      <Button
        variant="outline"
        className="w-full h-12 rounded-xl"
        onClick={() => setShowShareBadge(true)}
      >
        <Share2 className="w-4 h-4 mr-2" /> Invite Friends
      </Button>

      {/* Share badge modal */}
      {showShareBadge && profile && stats && (
        <ShareBadgeModal
          onClose={() => setShowShareBadge(false)}
          profile={{
            name: profile.name,
            avatarChoice: (profile as any).avatarChoice,
            photoUrl: (profile as any).photoUrl,
            goal: profile.goal,
          }}
          stats={{
            level: stats.level || 1,
            xp: stats.xp || 0,
            currentStreak: stats.currentStreak || 0,
            totalMealsLogged: stats.totalMealsLogged || 0,
          }}
        />
      )}

      {/* ── Subscription Management ── */}
      <SubscriptionSection profile={profile} />

      {/* ── Mail History ── */}
      <SectionLabel label="Mail" />
      <div className="rounded-2xl overflow-hidden border border-border/40">
        <button
          onClick={() => setShowMailSection(!showMailSection)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/20 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Inbox className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium">Email Inbox</span>
            <p className="text-xs text-muted-foreground">
              {emailHistory === undefined ? "Loading…" : `${emailHistory.length} email${emailHistory.length !== 1 ? "s" : ""} from Plate`}
            </p>
          </div>
          <ChevronDown
            className="w-4 h-4 text-muted-foreground transition-transform"
            style={{ transform: showMailSection ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {showMailSection && (
          <div className="border-t border-border/40">
            {(!emailHistory || emailHistory.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Mail className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No emails yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Welcome emails, updates, and notifications will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {emailHistory.map((log: any) => {
                  const typeColors: Record<string, string> = {
                    welcome: "text-green-600 dark:text-green-400 bg-green-500/10",
                    admin_upgrade: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
                    custom: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
                    otp: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
                    reminder: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
                  };
                  const colorClass = typeColors[log.emailType] || "text-muted-foreground bg-muted/50";
                  const typeLabel = log.emailType === "admin_upgrade" ? "Admin" :
                    log.emailType.charAt(0).toUpperCase() + log.emailType.slice(1);
                  return (
                    <div key={log._id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                              {typeLabel}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50">
                              {new Date(log.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">{log.subject}</p>
                          {log.previewHtml && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.previewHtml}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      <Button variant="outline" className="w-full h-12 rounded-xl" onClick={handleSignOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>

      {/* Delete account */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-center text-sm text-destructive hover:underline py-2"
        >
          Delete Account
        </button>
      ) : (
        <Card className="p-4 rounded-xl border-destructive/30 bg-destructive/5 space-y-3">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Are you sure? This cannot be undone.
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" className="flex-1 rounded-lg" onClick={() => { toast.error("Please contact support to delete your account."); setShowDeleteConfirm(false); }}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div className="label-uppercase text-muted-foreground pt-2">{label}</div>;
}

function EditableRow({
  icon,
  label,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  children,
  preview,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  children: React.ReactNode;
  preview?: React.ReactNode;
}) {
  return (
    <Card className="p-3.5 rounded-xl">
      {isEditing ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon} {label}
          </div>
          {children}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} className="h-9 flex-1 rounded-lg" disabled={saving}>
              <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} className="h-9 rounded-lg">Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={onEdit} className="w-full text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">{value}</span>
              <Pencil className="w-3 h-3 text-muted-foreground/40" />
            </div>
          </div>
          {preview && <div className="mt-2">{preview}</div>}
        </button>
      )}
    </Card>
  );
}

/** GLP-1 row — premium gated. Free users see a lock overlay that opens upgrade modal. */
function Glp1Row({ profile, editing, startEdit, saveField, setEditing, saving, editGlp1, setEditGlp1 }: {
  profile: any;
  editing: string | null;
  startEdit: (field: string) => void;
  saveField: (field: string) => Promise<void>;
  setEditing: (v: string | null) => void;
  saving: boolean;
  editGlp1: boolean;
  setEditGlp1: (v: boolean) => void;
}) {
  const hasPremium = usePremiumAccess();
  return (
    <PremiumGate feature="glp1" featureLabel="GLP-1 Support" overlayMode>
      <EditableRow
        icon={<Pill className="w-4 h-4" />}
        label="GLP-1 Medication"
        value={profile.usesGlp1 ? "Active" : "Off"}
        isEditing={editing === "glp1"}
        onEdit={() => hasPremium ? startEdit("glp1") : undefined}
        onSave={() => saveField("glp1")}
        onCancel={() => setEditing(null)}
        saving={saving}
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setEditGlp1(false)}
              className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${
                !editGlp1 ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"
              }`}
            >
              Off
            </button>
            <button
              onClick={() => setEditGlp1(true)}
              className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${
                editGlp1 ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"
              }`}
            >
              Active
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Raises your protein floor to preserve muscle during medication-assisted weight loss.</p>
        </div>
      </EditableRow>
    </PremiumGate>
  );
}

// ─── Subscription Management Section ─────────────────────────────────────────
function SubscriptionSection({ profile }: { profile: any }) {
  const hasPremium = usePremiumAccess();
  const [loading, setLoading] = useState(false);
  const createPortalUrl = useAction(api.stripe.createPortalUrl);

  if (!profile) return null;

  const status = (profile as any).subscriptionStatus as string | undefined;
  const trialEnd = (profile as any).trialEnd as number | undefined;
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const isCanceled = status === "canceled";
  const isPastDue = status === "past_due";

  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const url = await createPortalUrl({});
      window.open(url, "_blank");
    } catch {
      toast.error("Couldn't open billing portal. Contact support.");
    }
    setLoading(false);
  };

  const handleUpgrade = () => {
    window.location.href = "/upgrade";
  };

  return (
    <div className="space-y-3">
      <SectionLabel label="Subscription" />

      {/* Free user — upgrade CTA */}
      {!hasPremium && !isTrialing && (
        <Card className="p-4 rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10"
            style={{ background: "linear-gradient(135deg, var(--plate-green-accent), transparent)" }} />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5" style={{ color: "var(--plate-green-accent)" }} />
              <span className="font-semibold text-sm">Plate Premium</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}>
                $14.99/mo
              </span>
              <span className="text-xs text-muted-foreground">or $5.99/mo billed annually</span>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {[
                "🏋️ Workout generator with RIR tracking",
                "🛒 Grocery list tab",
                "💉 GLP-1 medication support",
                "🖼️ Premium AI avatars",
              ].map((f, i) => <div key={i}>{f}</div>)}
            </div>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Loading…" : "Start 7-Day Free Trial"}
            </button>
            <p className="text-xs text-center text-muted-foreground">Card required. Cancel anytime.</p>
          </div>
        </Card>
      )}

      {/* Trialing */}
      {isTrialing && trialDaysLeft !== null && (
        <Card className="p-4 rounded-xl border"
          style={{ borderColor: "var(--plate-green-accent)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" style={{ color: "var(--plate-green-accent)" }} />
              <span className="text-sm font-semibold">Free Trial Active</span>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}>
              {trialDaysLeft}d left
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Your trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}. You'll be charged based on your selected plan after that.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {loading ? "Opening…" : "Manage Billing"}
          </button>
        </Card>
      )}

      {/* Active subscriber */}
      {isActive && !isTrialing && (
        <Card className="p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" style={{ color: "var(--plate-green-accent)" }} />
              <span className="text-sm font-semibold">Premium Active</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}>
              ✓ Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Premium Active · Renews automatically</p>
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {loading ? "Opening…" : "Manage or Cancel"}
          </button>
        </Card>
      )}

      {/* Past due */}
      {isPastDue && (
        <Card className="p-4 rounded-xl border border-destructive/30">
          <div className="flex items-center gap-2 mb-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">Payment Failed</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Your last payment didn't go through. Update your card to keep Premium access.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-bold border-destructive/50 border flex items-center justify-center gap-1.5 text-destructive"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {loading ? "Opening…" : "Update Payment Method"}
          </button>
        </Card>
      )}

      {/* Canceled */}
      {isCanceled && (
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Premium Canceled</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Your subscription has ended. Resubscribe to get Premium features back.
          </p>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Loading…" : "Resubscribe"}
          </button>
        </Card>
      )}
    </div>
  );
}
