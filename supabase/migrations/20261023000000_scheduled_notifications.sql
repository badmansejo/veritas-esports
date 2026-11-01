CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
    message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 2000),
    link text NOT NULL DEFAULT '/notifications',
    audience_type text NOT NULL DEFAULT 'all'
        CHECK (audience_type IN ('all', 'user')),
    target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'cancelled', 'failed')),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    last_error text,
    CONSTRAINT scheduled_notifications_target_check
        CHECK (
            (audience_type = 'all' AND target_user_id IS NULL)
            OR
            (audience_type = 'user' AND target_user_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due
ON public.scheduled_notifications (scheduled_at)
WHERE status = 'pending';

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read scheduled notifications"
ON public.scheduled_notifications;

CREATE POLICY "Admins can read scheduled notifications"
ON public.scheduled_notifications
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
    )
);

DROP POLICY IF EXISTS "Admins can create scheduled notifications"
ON public.scheduled_notifications;

CREATE POLICY "Admins can create scheduled notifications"
ON public.scheduled_notifications
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
    )
);

DROP POLICY IF EXISTS "Admins can update scheduled notifications"
ON public.scheduled_notifications;

CREATE POLICY "Admins can update scheduled notifications"
ON public.scheduled_notifications
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
    )
);

GRANT SELECT, INSERT, UPDATE
ON public.scheduled_notifications TO authenticated;

