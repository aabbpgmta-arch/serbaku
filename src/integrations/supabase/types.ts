export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      homepage_banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subheadline: string | null
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subheadline?: string | null
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subheadline?: string | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          order_number: string
          payment_proof_url: string | null
          postal_code: string | null
          province: string
          shipping_cost: number
          shipping_payer: Database["public"]["Enums"]["shipping_payer"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_image_url: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_proof_url?: string | null
          postal_code?: string | null
          province: string
          shipping_cost?: number
          shipping_payer?: Database["public"]["Enums"]["shipping_payer"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_image_url?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_proof_url?: string | null
          postal_code?: string | null
          province?: string
          shipping_cost?: number
          shipping_payer?: Database["public"]["Enums"]["shipping_payer"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_image_url?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_bestseller: boolean
          is_new: boolean
          name: string
          price: number
          slug: string
          stock: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_new?: boolean
          name: string
          price: number
          slug: string
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_new?: boolean
          name?: string
          price?: number
          slug?: string
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          postal_code: string | null
          province: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          message: string
          name: string
          rating: number | null
          role: string | null
          sort_order: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          name: string
          rating?: number | null
          role?: string | null
          sort_order?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          name?: string
          rating?: number | null
          role?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      order_status:
        | "menunggu_pembayaran"
        | "diproses"
        | "dikirim"
        | "selesai"
        | "dibatalkan"
      product_category: "serba_35" | "serba_75" | "lainnya"
      shipping_payer: "pengirim" | "penerima"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      order_status: [
        "menunggu_pembayaran",
        "diproses",
        "dikirim",
        "selesai",
        "dibatalkan",
      ],
      product_category: ["serba_35", "serba_75", "lainnya"],
      shipping_payer: ["pengirim", "penerima"],
    },
  },
} as const
