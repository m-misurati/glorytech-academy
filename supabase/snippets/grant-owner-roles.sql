-- Makes the owner account an admin and links it to the instructor profile.
-- Run in the Supabase SQL Editor after that email has signed up on the platform.
do $$
declare
  v_email text := 'm.misurati@outlook.com'; -- the email you sign in with
  v_instructor_slug text := 'mohamed-al-misurati';
  v_user uuid;
begin
  select u.id into v_user from auth.users u where lower(u.email) = lower(v_email);
  if v_user is null then
    raise exception 'No account found for %. Sign up on the platform first.', v_email;
  end if;

  insert into private.admins (user_id) values (v_user) on conflict (user_id) do nothing;
  update public.instructors set user_id = v_user where slug = v_instructor_slug;
  raise notice 'Admin granted and instructor profile linked for %.', v_email;
end;
$$;
