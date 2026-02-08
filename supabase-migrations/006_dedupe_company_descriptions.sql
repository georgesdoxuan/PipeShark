-- Remove duplicate company descriptions (keep one per user+content, prefer oldest)
DELETE FROM company_descriptions a
WHERE EXISTS (
  SELECT 1 FROM company_descriptions b
  WHERE b.user_id = a.user_id
    AND TRIM(b.content) = TRIM(a.content)
    AND b.id < a.id
);
