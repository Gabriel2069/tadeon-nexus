-- TdV II is additive. Legacy character columns and campaign records remain intact.
begin;
alter table public.character_sheets add column if not exists rules_version smallint not null default 1;
alter table public.character_sheets add column if not exists tdv2_data jsonb;
alter table public.game_settings add column if not exists tdv2_state jsonb not null default '{}'::jsonb;

create or replace function private.tdv2_character_valid(d jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare
  k text; v numeric; imp integer; cad integer; nex integer; las integer;
  spent integer := 0; milestones integer; entry jsonb; current_value integer;
  matrix_values jsonb; grades jsonb; skill_count integer; ready boolean;
begin
  if d is null or jsonb_typeof(d) is distinct from 'object' or d->>'version' is distinct from '2' or jsonb_typeof(d->'ready') is distinct from 'boolean' or octet_length(d::text)>8388608 then return false; end if;
  ready := (d->>'ready')::boolean;
  matrix_values := d->'matrices'; grades := d->'alinhavos';
  if jsonb_typeof(matrix_values) is distinct from 'object' or (select count(*) from jsonb_object_keys(matrix_values))<>4 or jsonb_typeof(grades) is distinct from 'object' then return false; end if;
  foreach k in array array['Ímpeto','Cadência','Nexo','Lastro'] loop
    v := (matrix_values->>k)::numeric;
    if v is null or v<0 or v>5 or v<>trunc(v) then return false; end if;
  end loop;
  if ready and (select array_agg(value::integer order by value::integer) from jsonb_each_text(matrix_values)) <> array[2,2,3,3] then return false; end if;
  imp:=(matrix_values->>'Ímpeto')::integer; cad:=(matrix_values->>'Cadência')::integer; nex:=(matrix_values->>'Nexo')::integer; las:=(matrix_values->>'Lastro')::integer;
  select count(*) into skill_count from jsonb_object_keys(grades);
  if skill_count<>21 then return false; end if;
  foreach k in array array['Atletismo','Luta','Pontaria','Furtividade','Engenharia','Ciências','Medicina','Ofício','Percepção','Sobrevivência','Investigação','Condução','Diplomacia','Persuasão','Intimidação','Encenação','Sociedade','Tática','Iniciativa','Canalização','Selagem'] loop
    v:=(grades->>k)::numeric;
    if v is null or v<0 or v>2 or v<>trunc(v) then return false; end if;
  end loop;
  if ready and ((select count(*) from jsonb_each_text(grades) where value::integer=2)<>2 or (select count(*) from jsonb_each_text(grades) where value::integer=1)<>4) then return false; end if;
  if jsonb_typeof(d->'milestones') is distinct from 'array' or jsonb_typeof(d->'investments') is distinct from 'array' then return false; end if;
  milestones:=jsonb_array_length(d->'milestones');
  if milestones>20 or jsonb_array_length(d->'investments')>100 then return false; end if;
  for entry in select value from jsonb_array_elements(d->'milestones') loop
    if coalesce(btrim(entry->>'event'),'')='' or coalesce(btrim(entry->>'incorporation'),'')='' then return false; end if;
  end loop;
  for entry in select value from jsonb_array_elements(d->'investments') loop
    if not ready or coalesce(btrim(entry->>'reason'),'')='' then return false; end if;
    k:=entry->>'target';v:=(entry->>'cost')::numeric;
    if v is null or v<>trunc(v) then return false; end if;
    case entry->>'kind'
      when 'Matriz' then
        current_value:=case k when 'Ímpeto' then imp when 'Cadência' then cad when 'Nexo' then nex when 'Lastro' then las else null end;
        if current_value is null or current_value>=5 or v<>current_value+3 or (current_value=4 and coalesce((entry->>'transcendent')::boolean,false)=false) then return false; end if;
        case k when 'Ímpeto' then imp:=imp+1; when 'Cadência' then cad:=cad+1; when 'Nexo' then nex:=nex+1; when 'Lastro' then las:=las+1; end case;
      when 'Alinhavo' then
        current_value:=(grades->>k)::integer;
        if current_value is null or current_value>=4 or v<>2 then return false; end if;
        grades:=jsonb_set(grades,array[k],to_jsonb(current_value+1));
      when 'Lavor' then if v not in (4,6) or coalesce(btrim(k),'')='' then return false; end if;
      when 'Ampliação' then if v<3 or v>7 or coalesce(btrim(k),'')='' then return false; end if;
      else return false;
    end case;
    spent:=spent+v::integer;
  end loop;
  if spent>milestones*2 then return false; end if;
  foreach k in array array['pv','pi','pe'] loop
    v:=(d->'resources'->>k)::numeric;
    if v is null or v<0 or v<>trunc(v) or v>(case k when 'pv' then 6+2*imp when 'pi' then 6+nex+las else 5+nex+las end) then return false; end if;
  end loop;
  v:=(d->>'equilibrium')::numeric;if v is null or v<>trunc(v) or v < -10 or v>10 then return false; end if;
  v:=(d->>'tension')::numeric;if v is null or v<>trunc(v) or v < -3 or v>3 then return false; end if;
  if jsonb_typeof(d->'face') is distinct from 'object' or jsonb_typeof(d->'face'->'links') is distinct from 'array' or jsonb_typeof(d->'face'->'anchor') is distinct from 'object' or jsonb_typeof(d->'face'->'mark') is distinct from 'object' or jsonb_typeof(d->'scene') is distinct from 'object' then return false; end if;
  if ready then
    foreach k in array array['origin','occupation','conviction','limit'] loop if coalesce(btrim(d->'face'->>k),'')='' then return false; end if;end loop;
    if coalesce(btrim(d->'face'->'anchor'->>'detail'),'')='' or not exists(select 1 from jsonb_array_elements(d->'face'->'links') x where coalesce(btrim(x->>'node'),'')<>'' and coalesce(btrim(x->>'nature'),'')<>'') then return false; end if;
  end if;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then return false;
end; $$;
revoke all on function private.tdv2_character_valid(jsonb) from public, anon;
grant execute on function private.tdv2_character_valid(jsonb) to authenticated, service_role;
alter table public.character_sheets add constraint character_sheets_rules_edition check (rules_version in (1,2));
alter table public.character_sheets add constraint character_sheets_tdv2_valid check (rules_version<>2 or private.tdv2_character_valid(tdv2_data));

create or replace function private.guard_tdv2_sheet_progression()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare is_master boolean;
begin
  if auth.uid() is null then return new; end if;
  select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='mestre'::public.app_role) into is_master;
  if is_master then return new; end if;
  if tg_op='UPDATE' and old.rules_version=2 then
    if new.rules_version<>2 then raise exception 'Only a mestre may change a completed rules edition'; end if;
    if new.tdv2_data->'milestones' is distinct from old.tdv2_data->'milestones' then raise exception 'Marcos require recognition by a mestre'; end if;
    if old.tdv2_data->>'ready'='true' then
      if new.tdv2_data->>'ready'<>'true' or new.tdv2_data->'matrices' is distinct from old.tdv2_data->'matrices' or new.tdv2_data->'alinhavos' is distinct from old.tdv2_data->'alinhavos' then raise exception 'Initial competencies are fixed after creation'; end if;
      if jsonb_array_length(new.tdv2_data->'investments')<jsonb_array_length(old.tdv2_data->'investments') or exists(select 1 from jsonb_array_elements(old.tdv2_data->'investments') with ordinality x(entry,n) where entry is distinct from (new.tdv2_data->'investments')->(n::integer-1)) then raise exception 'Existing investments must be preserved'; end if;
    end if;
  elsif new.rules_version=2 and jsonb_array_length(new.tdv2_data->'milestones')<>0 then raise exception 'Only a mestre may grant initial Marcos';
  end if;
  return new;
end; $$;
revoke all on function private.guard_tdv2_sheet_progression() from public, anon;
grant execute on function private.guard_tdv2_sheet_progression() to authenticated, service_role;
create trigger character_sheets_tdv2_progression before insert or update on public.character_sheets for each row execute function private.guard_tdv2_sheet_progression();
comment on column public.character_sheets.tdv2_data is 'TdV II v2.0 only; legacy mechanics remain in their existing columns. No automatic conversion.';
comment on column public.game_settings.tdv2_state is 'Private mestre workspace for TdV II; not included in get_public_game_settings.';

-- Session history includes the edition and the complete versioned payload.
create or replace function public.sheet_history_snapshot(source jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'rules_version', source -> 'rules_version',
    'tdv2_data', source -> 'tdv2_data',
    'name', source -> 'name',
    'occupation', source -> 'occupation',
    'age', source -> 'age',
    'brand', source -> 'brand',
    'origin', source -> 'origin',
    'motivation', source -> 'motivation',
    'exposure', source -> 'exposure',
    'equilibrium', source -> 'equilibrium',
    'drift', source -> 'drift',
    'attributes', source -> 'attributes',
    'stats', source -> 'stats',
    'condition', source -> 'condition',
    'conditions', source -> 'conditions',
    'dying', source -> 'dying',
    'going_insane', source -> 'going_insane',
    'skills', source -> 'skills',
    'weapons', source -> 'weapons',
    'inventory', source -> 'inventory',
    'inventory_capacity', source -> 'inventory_capacity',
    'abilities', source -> 'abilities',
    'plots', source -> 'plots',
    'fragments', source -> 'fragments',
    'stat_upgrades', source -> 'stat_upgrades',
    'purchased_skills', source -> 'purchased_skills',
    'description', source -> 'description',
    'identity_data', source -> 'identity_data',
    'fragments_items', source -> 'fragments_items',
    'defense_items', source -> 'defense_items',
    'weapon_proficiency', source -> 'weapon_proficiency',
    'weapon_proficiency_family', source -> 'weapon_proficiency_family'
  );
$$;


create or replace function public.ensure_tdv2_knowledge_templates(p_workspace_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare actor uuid:=auth.uid(); inserted_count integer;
begin
  if actor is null or not private.is_feature_enabled('nexus_knowledge_enabled') or not private.can_manage_workspace(p_workspace_id) then raise exception using errcode='42501',message='KNOWLEDGE_TEMPLATE_PERMISSION_DENIED'; end if;
  insert into public.knowledge_templates(workspace_id,node_type,name,description,default_content,default_properties,required_fields,suggested_relations,is_default,created_by,updated_by)
  select p_workspace_id,t.node_type,t.name,'Estrutura normativa do TdV II v2.0, preservando páginas e templates personalizados.',t.content,'{"rules_version":2,"edition":"TdV II v2.0"}'::jsonb,'{}'::text[],'[]'::jsonb,true,actor,actor
  from (values
('character'::public.knowledge_node_type,'Feição TdV II','# {{title}}

## Origem


## Ofício


## Convicção


## Limite


## Marca: Gatilho, Manifestação, Resíduo


## Vínculos: Nó, Natureza, Estado, Oferta, Cobrança, Condição de tensão


## Âncora e forma de retorno


## Constituição e ficha vinculada


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('npc'::public.knowledge_node_type,'Presença TdV II','# {{title}}

## Figurante, Adversário ou Ameaça


## Intenção


## Capacidade relevante


## Consequência típica


## Estado necessário


## Relações e dependências


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('creature'::public.knowledge_node_type,'Ameaça TdV II','# {{title}}

## Identidade


## Magnitude 0–4 e escala de presença


## Intenção


## Ação característica e dois Fios


## Defesa pertinente


## Consequência


## Dependência e vulnerabilidade


## Costura de capacidades


## Condições alternativas de término


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('transcendental_ability'::public.knowledge_node_type,'Lavor TdV II','# {{title}}

## Vertente


## Gatilho


## Gesto


## Expressão


## Preço e limite


## Incorporação e aquisição em PU


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('fragment'::public.knowledge_node_type,'Fragmento TdV II','# {{title}}

## Suporte


## Relação preservada


## Acesso


## Uso e expressão


## Custo e risco


## Conservação


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('rule'::public.knowledge_node_type,'Trama TdV II','# {{title}}

## Natureza e acesso


## Alvo


## Intensidade: Repuxo, Tração, Estiramento


## Alcance


## Duração


## Resistência


## Custo em PE


## Puxagem


## Refluxo


## Assinatura


## Sustentação e Relaxamento


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('session'::public.knowledge_node_type,'Cena TdV II','# {{title}}

## Objetivo dos personagens


## Objetivo da oposição


## Posição


## Pressão e Ruptura anunciada


## Urgência


## Rodada: 2 Impulsos e 1 Resposta


## Condições de encerramento


## Resto e Permanência


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('clue'::public.knowledge_node_type,'Pista TdV II','# {{title}}

## Pergunta Central


## Evidência


## Fundamental, Direta ou Profunda


## Acesso coerente


## Contexto e interpretação


## Hipóteses e contradições


## Próxima intervenção


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
'),
('rule'::public.knowledge_node_type,'Selagem TdV II','# {{title}}

## Diagnóstico


## Ponto de Costura


## Acesso


## Tecitura


## Fixação


## Cargas concretas


## Resto e Permanência


## Manutenção


Fonte normativa: Livro de Regras TdV II v2.0. Nenhum bônus ou preço universal é inferido de um campo narrativo.
')
  ) as t(node_type,name,content)
  on conflict do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;
revoke all on function public.ensure_tdv2_knowledge_templates(uuid) from public, anon;
grant execute on function public.ensure_tdv2_knowledge_templates(uuid) to authenticated;
commit;
