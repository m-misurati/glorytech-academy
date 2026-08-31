alter table public.profiles
  add column phone text,
  add column affiliation text;

alter table public.profiles
  add constraint profiles_display_name_required
    check (display_name is not null and char_length(btrim(display_name)) between 2 and 120) not valid,
  add constraint profiles_phone_required
    check (
      phone is not null
      and phone ~ '^[+0-9][0-9 ()-]{6,19}$'
      and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15
    ) not valid,
  add constraint profiles_affiliation_length
    check (affiliation is null or char_length(btrim(affiliation)) between 1 and 120) not valid;

comment on column public.profiles.phone is 'Phone number supplied by the learner during free account creation.';
comment on column public.profiles.affiliation is 'Optional school, university, institute, or employer.';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  profile_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  profile_affiliation text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'affiliation', '')), '');
begin
  if profile_name is null or char_length(profile_name) not between 2 and 120 then
    raise exception 'A valid display name is required to create an account.' using errcode = '23514';
  end if;

  if profile_phone is null
    or profile_phone !~ '^[+0-9][0-9 ()-]{6,19}$'
    or char_length(regexp_replace(profile_phone, '[^0-9]', '', 'g')) not between 7 and 15 then
    raise exception 'A valid phone number is required to create an account.' using errcode = '23514';
  end if;

  if profile_affiliation is not null and char_length(profile_affiliation) > 120 then
    raise exception 'Affiliation must not exceed 120 characters.' using errcode = '22001';
  end if;

  insert into public.profiles (id, display_name, phone, affiliation)
  values (new.id, profile_name, profile_phone, profile_affiliation);

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
