-- Reconcile a Supabase project that was connected after users had already
-- registered. Auth triggers only handle future sign-ups, so existing users need
-- a one-time backfill.

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

-- The designated project owner must remain a master even if the schema is
-- restored after that account was created.
UPDATE public.user_roles
SET role = 'mestre'::public.app_role
WHERE user_id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('gabriel.tadeu.souza10@gmail.com')
  LIMIT 1
);

-- Owner emails are resolved through the protected profiles table. Keeping a
-- duplicated NOT NULL email on each sheet both leaks data and breaks current
-- inserts, which intentionally send only owner_id.
ALTER TABLE public.character_sheets
  DROP COLUMN IF EXISTS owner_email;

-- SQL-created tables are not guaranteed to inherit Data API grants. RLS remains
-- the authorization boundary; these grants only expose the permitted commands
-- to authenticated requests.
GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON TABLE
  public.profiles,
  public.user_roles,
  public.character_sheets,
  public.game_settings,
  public.game_rules
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.profiles
  TO authenticated;

GRANT SELECT
  ON TABLE public.user_roles, public.game_rules
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.character_sheets, public.game_settings
  TO authenticated;

CREATE INDEX IF NOT EXISTS character_sheets_owner_id_idx
  ON public.character_sheets (owner_id);

DROP POLICY IF EXISTS "Profiles: insert self" ON public.profiles;
CREATE POLICY "Profiles: insert self"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Avoid overlapping SELECT policies while keeping each master operation
-- explicit and protected by the caller's own role row.
DROP POLICY IF EXISTS "Settings: mestre write" ON public.game_settings;

CREATE POLICY "Settings: mestre insert"
  ON public.game_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

CREATE POLICY "Settings: mestre update"
  ON public.game_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

CREATE POLICY "Settings: mestre delete"
  ON public.game_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;

NOTIFY pgrst, 'reload schema';
