-- NEX-040: operational guard, optimistic concurrency and an explicit public round projection.
-- Additive migration. No existing character is converted; private mestre content stays private.
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
  if jsonb_typeof(d->'guard') is distinct from 'object' then return false; end if;
  v:=coalesce((d->'guard'->>'protection')::numeric,0);
  if v<>trunc(v) or v<0 or v>2 then return false; end if;
  if v>0 and (coalesce(btrim(d->'guard'->>'protectionSource'),'')='' or coalesce(btrim(d->'guard'->>'totalCover'),'')<>'') then return false; end if;
  v:=coalesce((d->'guard'->>'modifier')::numeric,0);
  if v<>trunc(v) or abs(v)>100 or (v<>0 and coalesce(btrim(d->'guard'->>'source'),'')='') then return false; end if;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then return false;
end; $$;

alter table public.game_settings add column if not exists tdv2_revision bigint not null default 0;

create or replace function private.tdv2_master_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.tdv2_state is distinct from old.tdv2_state then new.tdv2_revision:=old.tdv2_revision+1;
  else new.tdv2_revision:=old.tdv2_revision; end if;
  return new;
end; $$;
revoke all on function private.tdv2_master_revision() from public,anon;
create trigger tdv2_master_revision before update on public.game_settings for each row execute function private.tdv2_master_revision();

create or replace function private.publish_tdv2_round()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target_scene uuid; previous_scene uuid; scene uuid; participant jsonb; public_round jsonb; scenes uuid[]; changed integer:=0; affected integer:=0;
begin
  if new.key is distinct from 'global' or new.tdv2_state is not distinct from old.tdv2_state then return new; end if;
  target_scene:=nullif(new.tdv2_state->>'tabletopSceneId','')::uuid;
  previous_scene:=nullif(old.tdv2_state->>'tabletopSceneId','')::uuid;
  if target_scene is not null and not exists(select 1 from public.tabletop_scenes where id=target_scene and campaign_id=new.campaign_id) then
    raise exception 'A cena publicada precisa pertencer à campanha da condução';
  end if;
  scenes:=array_remove(array[target_scene,previous_scene],null);
  -- Delete only our reserved projection. Preserve every other authored token property.
  update public.tabletop_entities e set properties=e.properties-'tdv2_round'
  where e.scene_id=any(scenes) and e.properties ? 'tdv2_round'
    and (e.scene_id is distinct from target_scene or not exists(
      select 1 from jsonb_array_elements(coalesce(new.tdv2_state->'participants','[]'::jsonb)) p
      where p->>'sheetId'=e.linked_sheet_id::text));
  get diagnostics affected=row_count; changed:=changed+affected;
  if target_scene is not null then
    for participant in select value from jsonb_array_elements(coalesce(new.tdv2_state->'participants','[]'::jsonb)) loop
      if (participant->>'impulses')::integer not between 0 and 2 or participant->>'position' not in ('Favorecida','Disputada','Exposta') or jsonb_typeof(participant->'response') is distinct from 'boolean' then raise exception 'Estado público de rodada inválido'; end if;
      public_round:=jsonb_build_object('version',2,'round',(new.tdv2_state->>'round')::integer,'impulses',(participant->>'impulses')::integer,'responses',case when (participant->>'response')::boolean then 1 else 0 end,'position',participant->>'position','revision',new.tdv2_revision);
      update public.tabletop_entities e set properties=jsonb_set(e.properties,'{tdv2_round}',public_round)
      where e.scene_id=target_scene and e.linked_sheet_id::text=participant->>'sheetId'
        and (e.properties->'tdv2_round')-'revision' is distinct from public_round-'revision';
      get diagnostics affected=row_count; changed:=changed+affected;
    end loop;
  end if;
  -- Invalidation only; no private objective, clue, note, or character payload in broadcasts.
  -- Realtime RLS remains authoritative: only an active manager may broadcast.
  if changed=0 then return new; end if;
  foreach scene in array scenes loop
    if private.is_feature_enabled('nexus_realtime_enabled') and exists(
      select 1 from public.tabletop_sessions s join public.tabletop_session_participants p on p.session_id=s.id
      where s.current_scene_id=scene and s.status='open' and p.user_id=auth.uid() and p.state='active' and p.left_at is null and p.removed_by is null and p.role in ('master','co_master')
    ) then
      perform realtime.send(jsonb_build_object('protocol',1,'eventId','tdv2_'||gen_random_uuid()::text,'sourceId','tdv2_database','sceneId',scene,'sequence',new.tdv2_revision,'sentAt',floor(extract(epoch from clock_timestamp())*1000),'type','round.state','payload',jsonb_build_object('revision',new.tdv2_revision)),'tabletop.event','tabletop:scene:'||scene::text,true);
    end if;
  end loop;
  return new;
end; $$;
revoke all on function private.publish_tdv2_round() from public,anon;
create trigger tdv2_public_round after update on public.game_settings for each row execute function private.publish_tdv2_round();

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
'),
('rule'::public.knowledge_node_type,'Arma TdV II','# {{title}}

## Família


## Alcance


## Manejo


## Impacto


## Propriedades


## Porte e acesso


## Integridade: Apto / Danificado / Inutilizado


## Função e reparo


## Assinatura


Fonte normativa: Livro de Regras TdV II v2.0. Sem bônus, preço ou ação extra automáticos.'),
('rule'::public.knowledge_node_type,'Preparo TdV II','# {{title}}

## Gesto e custo real


## Gatilho


## Mudança permitida


## Continuidade e consumo


## Estado


Fonte normativa: Livro de Regras TdV II v2.0. Sem bônus, preço ou ação extra automáticos.'),
('rule'::public.knowledge_node_type,'Costura de Malha TdV II','# {{title}}

## Intenção única


## Lavores e Vertentes diferentes


## Contribuição concreta de cada Lavor


## Gatilhos válidos


## Preços e limites de ambas as práticas


## Teste único ou ações realmente distintas


## Resto e Permanência


Fonte normativa: Livro de Regras TdV II v2.0. Sem bônus, preço ou ação extra automáticos.'),
('rule'::public.knowledge_node_type,'Operação TdV II','# {{title}}

## Objetivo


## Etapas e condições de conclusão


## Limiar anunciado


## Frente de Pressão associada


## Intervenções e contribuições


## Progresso preservado na falha


## Resto e próxima intervenção


Fonte normativa: Livro de Regras TdV II v2.0. Sem bônus, preço ou ação extra automáticos.'),
('rule'::public.knowledge_node_type,'Reputação TdV II','# {{title}}

## Rede


## Imagem


## Peso: 0 Desconhecido / 1 Conhecido / 2 Reconhecido / 3 Referência / 4 Autoridade


## Cobrança


## Acontecimento que alterou o reconhecimento


Fonte normativa: Livro de Regras TdV II v2.0. Sem bônus, preço ou ação extra automáticos.')
  ) as t(node_type,name,content)
  on conflict do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end; $$;
revoke all on function public.ensure_tdv2_knowledge_templates(uuid) from public, anon;
grant execute on function public.ensure_tdv2_knowledge_templates(uuid) to authenticated;
commit;
