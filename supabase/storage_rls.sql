-- ── STORAGE RLS POLICIES ───────────────────────────────────────────────────

-- 1. Enable RLS on the storage.objects table (if not already enabled)
-- Note: This is usually enabled by default in Supabase.

-- 2. Allow users to see only their own folder in 'datasets' bucket
CREATE POLICY "Users can only view their own datasets" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Allow users to upload to their own folder in 'datasets' bucket
CREATE POLICY "Users can only upload to their own folder" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Allow users to update their own datasets
CREATE POLICY "Users can only update their own datasets" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Allow users to delete their own datasets
CREATE POLICY "Users can only delete their own datasets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ── DATABASE RLS POLICIES (CONVERSATIONS) ──────────────────────────────────

-- 1. Enable RLS on the conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. Policy for selecting own conversations
CREATE POLICY "Users can only view their own conversations" 
ON public.conversations FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 3. Policy for inserting own conversations
CREATE POLICY "Users can only insert their own conversations" 
ON public.conversations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 4. Policy for updating own conversations
CREATE POLICY "Users can only update their own conversations" 
ON public.conversations FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 5. Policy for deleting own conversations
CREATE POLICY "Users can only delete their own conversations" 
ON public.conversations FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
