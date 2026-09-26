-- A public profile link for each instructor, shown on the instructor card and page.
-- Only https is accepted, so a pasted "linkedin.com/in/..." cannot become a relative
-- link that points back at the academy.
alter table public.instructors
  add column if not exists linkedin_url text
  check (linkedin_url is null or linkedin_url ~ '^https://[a-z]{2,3}\.linkedin\.com/');

comment on column public.instructors.linkedin_url is 'Public LinkedIn profile, shown as a link on the instructor card.';

update public.instructors
set linkedin_url = 'https://www.linkedin.com/in/mohamed-bashir-misurati/'
where slug = 'mohamed-al-misurati';
