-- Add content_variant column for A/B tracking marketing content styles
-- Values: number_hook, listicle, contrarian, question_hook, calculator, challenge, product_push
alter table marketing_posts add column if not exists content_variant text;
create index if not exists idx_marketing_posts_variant on marketing_posts(content_variant);
