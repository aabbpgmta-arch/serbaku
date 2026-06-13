CREATE OR REPLACE FUNCTION public.tg_profiles_protect_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RETURN NEW;
    END IF;

    IF NEW.membership_tier <> 'new'::public.membership_tier OR NEW.lifetime_spend <> 0 THEN
      RAISE EXCEPTION 'Membership fields are managed by the system';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.lifetime_spend IS DISTINCT FROM OLD.lifetime_spend THEN
    IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Membership fields are managed by the system';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_membership ON public.profiles;
CREATE TRIGGER trg_profiles_protect_membership
BEFORE INSERT OR UPDATE OF membership_tier, lifetime_spend ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tg_profiles_protect_membership();

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (email, full_name, whatsapp, address, city, province, postal_code, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
REVOKE EXECUTE ON FUNCTION public.tg_profiles_protect_membership() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_profiles_protect_membership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_profiles_protect_membership() FROM authenticated;