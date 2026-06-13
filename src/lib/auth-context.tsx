import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { MembershipTier } from "@/lib/membership";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  membershipTier: MembershipTier;
  lifetimeSpend: number;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  membershipTier: "new",
  lifetimeSpend: 0,
  refreshMembership: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>("new");
  const [lifetimeSpend, setLifetimeSpend] = useState(0);

  async function loadUserExtras(userId: string) {
    const [{ data: role }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("membership_tier, lifetime_spend").eq("id", userId).maybeSingle(),
    ]);
    setIsAdmin(!!role);
    setMembershipTier((profile?.membership_tier as MembershipTier) ?? "new");
    setLifetimeSpend(Number(profile?.lifetime_spend ?? 0));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadUserExtras(s.user.id), 0);
      } else {
        setIsAdmin(false);
        setMembershipTier("new");
        setLifetimeSpend(0);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadUserExtras(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function refreshMembership() {
    if (session?.user) await loadUserExtras(session.user.id);
  }

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        loading,
        membershipTier,
        lifetimeSpend,
        refreshMembership,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
