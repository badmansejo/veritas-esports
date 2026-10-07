CREATE OR REPLACE FUNCTION public.admin_create_marketplace_item(
    p_category_id uuid,
    p_name text,
    p_slug text,
    p_description text DEFAULT NULL,
    p_item_type text DEFAULT 'Name Effect',
    p_price_vcoins integer DEFAULT 0,
    p_price_kes numeric DEFAULT NULL,
    p_image_url text DEFAULT NULL,
    p_preview_data jsonb DEFAULT '{}'::jsonb,
    p_is_active boolean DEFAULT true,
    p_is_limited boolean DEFAULT false,
    p_starts_at timestamptz DEFAULT NULL,
    p_expires_at timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id uuid;
    v_item_id uuid;
BEGIN
    SELECT id
    INTO v_admin_id
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Administrator access required.';
    END IF;

    IF NULLIF(trim(p_name), '') IS NULL THEN
        RAISE EXCEPTION 'Item name is required.';
    END IF;

    IF NULLIF(trim(p_slug), '') IS NULL THEN
        RAISE EXCEPTION 'Item slug is required.';
    END IF;

    IF p_price_vcoins < 0 THEN
        RAISE EXCEPTION 'V Coins price cannot be negative.';
    END IF;

    INSERT INTO public.marketplace_items (
        category_id,
        name,
        slug,
        description,
        item_type,
        price_vcoins,
        price_kes,
        image_url,
        preview_data,
        is_active,
        is_limited,
        starts_at,
        expires_at,
        created_at,
        updated_at
    )
    VALUES (
        p_category_id,
        trim(p_name),
        trim(p_slug),
        NULLIF(trim(p_description), ''),
        trim(p_item_type),
        p_price_vcoins,
        p_price_kes,
        NULLIF(trim(p_image_url), ''),
        COALESCE(p_preview_data, '{}'::jsonb),
        COALESCE(p_is_active, true),
        COALESCE(p_is_limited, false),
        p_starts_at,
        p_expires_at,
        now(),
        now()
    )
    RETURNING id INTO v_item_id;

    RETURN json_build_object(
        'success', true,
        'id', v_item_id
    );
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_create_marketplace_item(
    uuid,
    text,
    text,
    text,
    text,
    integer,
    numeric,
    text,
    jsonb,
    boolean,
    boolean,
    timestamptz,
    timestamptz
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_create_marketplace_item(
    uuid,
    text,
    text,
    text,
    text,
    integer,
    numeric,
    text,
    jsonb,
    boolean,
    boolean,
    timestamptz,
    timestamptz
)
TO authenticated;
