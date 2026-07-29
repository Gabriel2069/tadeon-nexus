create index if not exists app_error_logs_resolved_by_idx
on public.app_error_logs (resolved_by)
where resolved_by is not null;
