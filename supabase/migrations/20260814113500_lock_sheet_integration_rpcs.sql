revoke all on function public.save_session_sheet_changes() from public;
revoke all on function public.save_session_sheet_changes() from anon;
grant execute on function public.save_session_sheet_changes() to authenticated;

revoke all on function public.get_sheet_session_changes(uuid, integer) from public;
revoke all on function public.get_sheet_session_changes(uuid, integer) from anon;
grant execute on function public.get_sheet_session_changes(uuid, integer) to authenticated;

revoke all on function public.link_sheet_knowledge(uuid, text, text) from public;
revoke all on function public.link_sheet_knowledge(uuid, text, text) from anon;
grant execute on function public.link_sheet_knowledge(uuid, text, text) to authenticated;

revoke all on function public.get_sheet_knowledge_links(uuid) from public;
revoke all on function public.get_sheet_knowledge_links(uuid) from anon;
grant execute on function public.get_sheet_knowledge_links(uuid) to authenticated;