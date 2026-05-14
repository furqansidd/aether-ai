-- ── STORAGE RLS POLICIES (SIMPLIFIED & ROBUST) ───────────────────────────────

-- 1. Clear old policies (Note: We skip ALTER TABLE as Supabase manages ownership)
DROP POLICY IF EXISTS "Individual User Storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can only view their own datasets" ON storage.objects;
DROP POLICY IF EXISTS "Users can only upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can only update their own datasets" ON storage.objects;
DROP POLICY IF EXISTS "Users can only delete their own datasets" ON storage.objects;
DROP POLICY IF EXISTS "Manage own datasets" ON storage.objects;

-- 2. Create a clean, simple policy using path prefix matching
-- This policy allows users to manage files only in their own folder (named by their UID)
CREATE POLICY "Manage own datasets"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'datasets' AND 
    (name LIKE (auth.uid()::text || '/%'))
)
WITH CHECK (
    bucket_id = 'datasets' AND 
    (name LIKE (auth.uid()::text || '/%'))
);


-- ── DATABASE RLS POLICIES (CONVERSATIONS) ──────────────────────────────────

-- 1. Enable RLS on the conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. Unified policy for conversations
DROP POLICY IF EXISTS "Users can only view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can only insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can only update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can only delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Manage own conversations" ON public.conversations;

CREATE POLICY "Manage own conversations"
ON public.conversations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
