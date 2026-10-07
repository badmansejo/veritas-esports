DROP POLICY IF EXISTS "Admins can insert notifications"
ON public.notifications;

CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
    )
);

GRANT INSERT ON public.notifications TO authenticated;
