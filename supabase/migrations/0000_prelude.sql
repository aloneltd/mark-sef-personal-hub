-- Auth helper: is the current user the operator (m@alone.ltd)?
create or replace function is_admin()
returns boolean
language plpgsql stable security definer
as $$
begin
  return coalesce((select auth.email() = 'm@alone.ltd'), false);
end;
$$;

-- Auto-update updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
