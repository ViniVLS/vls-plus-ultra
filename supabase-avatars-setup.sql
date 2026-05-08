-- ============================================
-- VLS PLUS - Script SQL para Bucket de Avatares
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Criar bucket 'avatars' (público para leitura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- 2. Permitir que qualquer usuário leia avatares
CREATE POLICY "anyone_can_view_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 3. Permitir que usuários façam upload do próprio avatar
CREATE POLICY "users_can_upload_own_avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Permitir que usuários atualizem/sobrescrevam seu próprio avatar
CREATE POLICY "users_can_update_own_avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  ) WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Permitir que usuários excluam seu próprio avatar
CREATE POLICY "users_can_delete_own_avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- SQL para adicionar coluna avatar_url na tabela profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;