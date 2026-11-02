-- A notification often states one vacancy total for all its posts and no split by post. The total lives on the recruitment, and the site
-- shows it with a "*" for any post that has no count of its own. Competitor leads also carry the pay the page states.
alter table public.recruitments add column if not exists vacancy_total integer check (vacancy_total is null or vacancy_total > 0);
alter table public.notification_leads add column if not exists salary_text text;
