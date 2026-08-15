create or replace function public.get_knowledge_graph_memory(
  p_workspace_id uuid,
  p_focus_node_id uuid,
  p_campaign_id uuid default null::uuid,
  p_include_workspace boolean default true,
  p_candidate_limit integer default 400,
  p_node_types public.knowledge_node_type[] default null::public.knowledge_node_type[],
  p_relation_types public.knowledge_relation_type[] default null::public.knowledge_relation_type[],
  p_visibilities public.knowledge_visibility[] default null::public.knowledge_visibility[]
)
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  graph_result jsonb;
begin
  if p_workspace_id is null
    or p_focus_node_id is null
    or p_candidate_limit not between 40 and 500
  then
    raise exception using
      errcode = '22023',
      message = 'KNOWLEDGE_GRAPH_INVALID';
  end if;

  if not private.is_feature_enabled('nexus_graph_enabled') then
    raise exception using
      errcode = 'P0001',
      message = 'KNOWLEDGE_GRAPH_DISABLED';
  end if;

  with
  scoped as materialized (
    select node.*
    from public.knowledge_nodes node
    where node.workspace_id = p_workspace_id
      and node.deleted_at is null
      and (
        (p_campaign_id is null and node.campaign_id is null)
        or (
          p_campaign_id is not null
          and (
            node.campaign_id = p_campaign_id
            or (p_include_workspace and node.campaign_id is null)
          )
        )
      )
      and (
        node.id = p_focus_node_id
        or p_node_types is null
        or node.node_type = any (p_node_types)
      )
      and (
        node.id = p_focus_node_id
        or p_visibilities is null
        or node.visibility = any (p_visibilities)
      )
  ),
  candidate as materialized (
    select scoped.*
    from scoped
    order by
      (scoped.id = p_focus_node_id) desc,
      (scoped.campaign_id is not distinct from p_campaign_id) desc,
      scoped.updated_at desc,
      scoped.id
    limit p_candidate_limit
  ),
  node_rows as materialized (
    select
      candidate.id,
      candidate.title,
      left(coalesce(candidate.summary, ''), 420) as summary,
      candidate.node_type,
      candidate.icon,
      candidate.status,
      candidate.visibility,
      candidate.campaign_id,
      candidate.parent_node_id,
      candidate.updated_at,
      coalesce(tag_data.tags, array[]::text[]) as tags,
      coalesce(term_data.terms, array[]::text[]) as semantic_terms,
      (
        select count(*)::integer
        from public.knowledge_edges edge
        join candidate other
          on other.id = case
            when edge.source_node_id = candidate.id then edge.target_node_id
            else edge.source_node_id
          end
        where edge.deleted_at is null
          and (
            edge.source_node_id = candidate.id
            or edge.target_node_id = candidate.id
          )
          and (
            p_relation_types is null
            or edge.relation_type = any (p_relation_types)
          )
      ) as explicit_degree,
      (
        select count(*)::integer
        from public.knowledge_mentions mention
        join candidate source on source.id = mention.source_node_id
        where mention.target_node_id = candidate.id
      ) as incoming_mentions,
      (
        select count(*)::integer
        from public.knowledge_mentions mention
        join candidate target on target.id = mention.target_node_id
        where mention.source_node_id = candidate.id
      ) as outgoing_mentions
    from candidate
    left join lateral (
      select array_agg(tag.name order by lower(tag.name), tag.id) as tags
      from public.knowledge_node_tags node_tag
      join public.knowledge_tags tag
        on tag.id = node_tag.tag_id
       and tag.deleted_at is null
      where node_tag.node_id = candidate.id
    ) tag_data on true
    left join lateral (
      select array_agg(ranked.term order by ranked.frequency desc, ranked.term) as terms
      from (
        select token.term, count(*)::integer as frequency
        from regexp_split_to_table(
          lower(
            coalesce(candidate.title, '') || ' ' ||
            coalesce(candidate.summary, '') || ' ' ||
            left(coalesce(candidate.plain_text, ''), 12000)
          ),
          '[^[:alnum:]_]+'
        ) as token(term)
        where char_length(token.term) >= 4
          and token.term !~ '^[0-9]+([.,][0-9]+)?$'
          and not (
            token.term = any (
              array[
                'aquela','aquele','aqueles','aquelas','ainda','assim','cada',
                'como','contra','coisa','coisas','daquele','daquela','depois',
                'desde','dessa','desse','desta','deste','entre','essa','esse',
                'esta','este','foram','isso','isto','mais','mesma','mesmo',
                'muito','muita','muitos','muitas','nesta','neste','nessa',
                'nesse','outra','outro','outras','outros','para','pela','pelas',
                'pelo','pelos','porque','quando','sobre','tambem','também',
                'tendo','todos','todas','uma','umas','uns'
              ]::text[]
            )
          )
        group by token.term
        order by count(*) desc, token.term
        limit 48
      ) ranked
    ) term_data on true
  ),
  explicit_signals as (
    select
      edge.id::text as id,
      edge.source_node_id,
      edge.target_node_id,
      'explicit'::text as kind,
      edge.relation_type,
      coalesce(
        nullif(btrim(edge.label), ''),
        replace(edge.relation_type::text, '_', ' ')
      ) as label,
      edge.direction,
      edge.visibility,
      least(
        0.98,
        case edge.relation_type
          when 'opposes' then 0.92
          when 'allied_with' then 0.90
          when 'member_of' then 0.86
          when 'owns' then 0.86
          when 'created_by' then 0.84
          when 'parent_of' then 0.88
          when 'child_of' then 0.88
          when 'part_of' then 0.86
          when 'contains' then 0.86
          when 'located_in' then 0.82
          when 'reveals' then 0.80
          when 'precedes' then 0.78
          when 'follows' then 0.78
          when 'mentions' then 0.62
          when 'related_to' then 0.58
          else 0.66
        end
        + case when nullif(btrim(edge.label), '') is not null then 0.04 else 0 end
      )::double precision as strength,
      array[
        case
          when nullif(btrim(edge.label), '') is not null
            then 'Relação explícita: ' || left(btrim(edge.label), 120)
          else 'Relação explícita: ' || replace(edge.relation_type::text, '_', ' ')
        end
      ]::text[] as evidence
    from public.knowledge_edges edge
    join candidate source on source.id = edge.source_node_id
    join candidate target on target.id = edge.target_node_id
    where edge.deleted_at is null
      and (
        p_relation_types is null
        or edge.relation_type = any (p_relation_types)
      )
  ),
  mention_signals as (
    select
      'mention:' || mention.source_node_id::text || ':' || mention.target_node_id::text as id,
      mention.source_node_id,
      mention.target_node_id,
      'mention'::text as kind,
      'mentions'::public.knowledge_relation_type as relation_type,
      case
        when count(*) = 1 then '1 menção no conteúdo'
        else count(*)::text || ' menções no conteúdo'
      end as label,
      'directed'::public.knowledge_relation_direction as direction,
      source.visibility,
      least(
        0.82,
        0.48 + ln(1 + count(*)::double precision) * 0.12
      )::double precision as strength,
      array[
        case
          when count(*) = 1 then 'A página cita a outra diretamente no conteúdo.'
          else 'A página cita a outra ' || count(*)::text || ' vezes no conteúdo.'
        end
      ]::text[] as evidence
    from public.knowledge_mentions mention
    join candidate source on source.id = mention.source_node_id
    join candidate target on target.id = mention.target_node_id
    where p_relation_types is null
      or 'mentions'::public.knowledge_relation_type = any (p_relation_types)
    group by mention.source_node_id, mention.target_node_id, source.visibility
  ),
  hierarchy_signals as (
    select
      'hierarchy:' || child.id::text as id,
      child.id as source_node_id,
      parent.id as target_node_id,
      'hierarchy'::text as kind,
      'part_of'::public.knowledge_relation_type as relation_type,
      'Hierarquia de página'::text as label,
      'directed'::public.knowledge_relation_direction as direction,
      child.visibility,
      0.90::double precision as strength,
      array['Relação estrutural pai/filho do Nexus.']::text[] as evidence
    from candidate child
    join candidate parent on parent.id = child.parent_node_id
    where p_relation_types is null
      or 'part_of'::public.knowledge_relation_type = any (p_relation_types)
  ),
  graph_signals as (
    select * from explicit_signals
    union all
    select * from mention_signals
    union all
    select * from hierarchy_signals
  )
  select jsonb_build_object(
    'focusNodeId', p_focus_node_id,
    'candidateLimit', p_candidate_limit,
    'truncated', (select count(*) > p_candidate_limit from scoped),
    'nodes', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', node_rows.id,
            'title', node_rows.title,
            'summary', node_rows.summary,
            'nodeType', node_rows.node_type,
            'icon', node_rows.icon,
            'status', node_rows.status,
            'visibility', node_rows.visibility,
            'campaignId', node_rows.campaign_id,
            'parentNodeId', node_rows.parent_node_id,
            'updatedAt', node_rows.updated_at,
            'tags', node_rows.tags,
            'semanticTerms', node_rows.semantic_terms,
            'explicitDegree', node_rows.explicit_degree,
            'incomingMentions', node_rows.incoming_mentions,
            'outgoingMentions', node_rows.outgoing_mentions
          )
          order by
            (node_rows.id = p_focus_node_id) desc,
            lower(node_rows.title),
            node_rows.id
        )
        from node_rows
      ),
      '[]'::jsonb
    ),
    'signals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', graph_signals.id,
            'sourceNodeId', graph_signals.source_node_id,
            'targetNodeId', graph_signals.target_node_id,
            'kind', graph_signals.kind,
            'relationType', graph_signals.relation_type,
            'label', graph_signals.label,
            'direction', graph_signals.direction,
            'visibility', graph_signals.visibility,
            'strength', graph_signals.strength,
            'evidence', graph_signals.evidence
          )
          order by graph_signals.strength desc, graph_signals.id
        )
        from graph_signals
      ),
      '[]'::jsonb
    )
  )
  into graph_result;

  if graph_result is null
    or not exists (
      select 1
      from candidate
      where candidate.id = p_focus_node_id
    )
  then
    raise exception using
      errcode = 'P0002',
      message = 'KNOWLEDGE_GRAPH_FOCUS_NOT_FOUND';
  end if;

  return graph_result;
end;
$function$;

revoke all on function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) from public;

grant execute on function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) to authenticated;
