insert into public.plans(code, name) values
  ('free', 'Free'),
  ('founding_pro_3m', 'Founding Pro Pass'),
  ('pro_monthly', 'Pro Monthly'),
  ('pro_annual', 'Pro Annual'),
  ('pro_plus_monthly', 'Pro Plus Monthly'),
  ('pro_plus_annual', 'Pro Plus Annual')
on conflict (code) do nothing;

insert into public.qualification_levels(name, slug, rank) values
  ('8th Pass', '8th-pass', 1),
  ('10th Pass', '10th-pass', 2),
  ('12th Pass', '12th-pass', 3),
  ('ITI', 'iti', 4),
  ('Diploma', 'diploma', 5),
  ('Graduate', 'graduate', 6),
  ('B.Tech', 'btech', 7),
  ('Postgraduate', 'postgraduate', 8)
on conflict (slug) do nothing;
