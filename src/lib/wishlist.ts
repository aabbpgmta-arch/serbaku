import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function useWishlistIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wishlist_ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: { product_id: string }) => r.product_id));
    },
  });
}

export function useToggleWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, isOn }: { productId: string; isOn: boolean }) => {
      if (!user) throw new Error("not_auth");
      if (isOn) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ["wishlist_ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["wishlist_items", user?.id] });
      toast.success(added ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist");
    },
    onError: (e: Error) => {
      if (e.message === "not_auth") toast.error("Silakan masuk untuk menyimpan wishlist");
      else toast.error("Gagal memperbarui wishlist");
    },
  });
}
