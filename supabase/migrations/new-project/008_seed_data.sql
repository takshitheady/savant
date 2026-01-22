-- ============================================================================
-- Migration: 008_seed_data.sql
-- Description: Seed essential data (store categories)
-- ============================================================================

-- ============================================================================
-- SEED STORE CATEGORIES
-- ============================================================================
-- Insert the 10 marketplace categories

INSERT INTO public.store_categories (name, slug, description, icon, display_order, is_active)
VALUES
  ('Writing', 'writing', 'Content creation, copywriting, editing assistants', 'PenTool', 1, true),
  ('Coding', 'coding', 'Programming assistance, code review, debugging helpers', 'Code', 2, true),
  ('Research', 'research', 'Academic research, data analysis, fact-checking', 'Search', 3, true),
  ('Business', 'business', 'Strategy, operations, management consultants', 'Briefcase', 4, true),
  ('Education', 'education', 'Teaching, tutoring, learning assistance', 'GraduationCap', 5, true),
  ('Creative', 'creative', 'Art, design, brainstorming partners', 'Palette', 6, true),
  ('Productivity', 'productivity', 'Task management, organization, automation', 'Zap', 7, true),
  ('Customer Support', 'customer-support', 'Help desk, FAQs, ticket handling', 'Headphones', 8, true),
  ('Marketing', 'marketing', 'SEO, social media, campaign management', 'Megaphone', 9, true),
  ('Other', 'other', 'General purpose assistants', 'Sparkles', 10, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Verification: Check categories were inserted
-- ============================================================================
-- Run this query to verify:
-- SELECT name, slug, display_order FROM store_categories ORDER BY display_order;
-- You should see all 10 categories
