-- Phase 1 follow-up: cover the feature flag audit foreign key.

CREATE INDEX IF NOT EXISTS feature_flags_updated_by_idx
  ON public.feature_flags (updated_by);
