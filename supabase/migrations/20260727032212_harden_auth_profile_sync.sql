-- Keep public profile data synchronized with Supabase Auth without exposing
-- auth.users or relying on client-side writes.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email,
      'Usuário'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN lower(NEW.email) = lower('gabriel.tadeu.souza10@gmail.com')
        THEN 'mestre'::public.app_role
      ELSE 'jogador'::public.app_role
    END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email,
      'Usuário'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(public.profiles.full_name, ''),
      NEW.email,
      'Usuário'
    ),
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_from_auth()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email
    OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.sync_profile_from_auth();

INSERT INTO public.profiles (id, email, full_name)
SELECT
  users.id,
  users.email,
  COALESCE(
    NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
    users.email,
    'Usuário'
  )
FROM auth.users AS users
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT
  users.id,
  CASE
    WHEN lower(users.email) = lower('gabriel.tadeu.souza10@gmail.com')
      THEN 'mestre'::public.app_role
    ELSE 'jogador'::public.app_role
  END
FROM auth.users AS users
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.user_roles
SET role = 'mestre'::public.app_role
WHERE user_id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('gabriel.tadeu.souza10@gmail.com')
  LIMIT 1
);

COMMENT ON FUNCTION public.sync_profile_from_auth() IS
  'Synchronizes display-only profile fields after a Supabase Auth user changes.';

NOTIFY pgrst, 'reload schema';
