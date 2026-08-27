-- Add policy to allow admins to delete profiles
create policy "Admins can delete profiles"
    on public.profiles for delete
    using (public.is_admin());
