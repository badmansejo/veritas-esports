CREATE TABLE IF NOT EXISTS public.referral_fraud_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL UNIQUE REFERENCES public.referrals(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'investigating'
    CHECK (review_status IN ('investigating', 'flagged', 'cleared', 'confirmed_abuse')),
  notes text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_fraud_reviews_status
  ON public.referral_fraud_reviews(review_status);

ALTER TABLE public.referral_fraud_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage referral fraud reviews"
  ON public.referral_fraud_reviews;

CREATE POLICY "Admins manage referral fraud reviews"
ON public.referral_fraud_reviews
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);
