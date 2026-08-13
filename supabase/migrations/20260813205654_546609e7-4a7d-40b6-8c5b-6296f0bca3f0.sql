DO $$
DECLARE src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'seed_bookly_demo';

  src := regexp_replace(src, 'DELETE FROM public\.(\w+);', 'DELETE FROM public.\1 WHERE true;', 'g');
  EXECUTE src;
END $$;