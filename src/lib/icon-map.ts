import {
  Tag, Package, Users, Truck, Sparkles, Star,
  RefreshCw, BadgePercent, Wallet, Coins, Banknote, ShoppingBag,
  Shirt, Store, Gift, Headset, Phone, ShieldCheck, CheckCircle,
  Award, Crown, HeartHandshake, Rocket, Target, TrendingUp,
  Calendar, Clock, MapPin, Box, Percent, BadgeCheck, HandCoins,
  CircleDollarSign, MessagesSquare, Zap, ThumbsUp, Gem, Medal,
  type LucideIcon,
} from "lucide-react";

// Using BarChart3 alias for chart-column to avoid version mismatch
import { BarChart3 } from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  tag: Tag,
  package: Package,
  users: Users,
  truck: Truck,
  sparkles: Sparkles,
  star: Star,
  "refresh-cw": RefreshCw,
  "badge-percent": BadgePercent,
  wallet: Wallet,
  coins: Coins,
  banknote: Banknote,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  store: Store,
  gift: Gift,
  headset: Headset,
  phone: Phone,
  "shield-check": ShieldCheck,
  "check-circle": CheckCircle,
  award: Award,
  crown: Crown,
  "heart-handshake": HeartHandshake,
  rocket: Rocket,
  target: Target,
  "trending-up": TrendingUp,
  "chart-column": BarChart3,
  "calendar-days": Calendar,
  clock: Clock,
  "map-pinned": MapPin,
  box: Box,
  percent: Percent,
  "badge-check": BadgeCheck,
  "hand-coins": HandCoins,
  "circle-dollar-sign": CircleDollarSign,
  "messages-square": MessagesSquare,
  zap: Zap,
  "thumbs-up": ThumbsUp,
  gem: Gem,
  medal: Medal,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

/** Resolve an icon name (case/space insensitive) to a Lucide component.
 *  Falls back to Sparkles when the name is empty, unknown, or invalid. */
export function getIcon(name?: string | null): LucideIcon {
  if (!name || typeof name !== "string") return Sparkles;
  const key = name.trim().toLowerCase().replace(/[_\s]+/g, "-");
  return ICON_MAP[key] ?? Sparkles;
}
