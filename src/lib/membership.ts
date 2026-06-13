// Aturan sistem membership (sinkron dengan public.compute_membership_tier di Supabase)
export type MembershipTier = "new" | "grande" | "elite" | "royal";

export const TIERS: Array<{
  key: MembershipTier;
  label: string;
  minSpend: number;
  discountPerPcs: number;
  color: string;
}> = [
  { key: "new",    label: "New",    minSpend: 0,       discountPerPcs: 0,    color: "bg-muted text-foreground" },
  { key: "grande", label: "Grande", minSpend: 500_000, discountPerPcs: 250,  color: "bg-pink-100 text-pink-700" },
  { key: "elite",  label: "Elite",  minSpend: 2_000_000, discountPerPcs: 500,  color: "bg-fuchsia-100 text-fuchsia-700" },
  { key: "royal",  label: "Royal",  minSpend: 5_000_000, discountPerPcs: 1000, color: "bg-amber-100 text-amber-700" },
];

export function tierMeta(tier: MembershipTier) {
  return TIERS.find((t) => t.key === tier) ?? TIERS[0];
}

export function computeTierFromSpend(spend: number): MembershipTier {
  let res: MembershipTier = "new";
  for (const t of TIERS) if (spend >= t.minSpend) res = t.key;
  return res;
}

export function discountForTier(tier: MembershipTier, totalQty: number): number {
  return tierMeta(tier).discountPerPcs * Math.max(0, Math.floor(totalQty));
}

export function nextTier(tier: MembershipTier) {
  const idx = TIERS.findIndex((t) => t.key === tier);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}
