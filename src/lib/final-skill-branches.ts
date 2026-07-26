import type { SkillBranch } from "@/lib/sheet-types";

// Generated from the four canonical ability tables in the final rules document.
// Kept as data so the player sheet and the master rules editor share one source of truth.
export const FINAL_SKILL_BRANCHES: SkillBranch[] = [
  {
    "id": "corporeo",
    "label": "Corpóreo",
    "color": "#74242D",
    "nodes": [
      {
        "id": "corporeo-impacto-bruto",
        "name": "Impacto Bruto",
        "desc": "Uma vez por turno, gaste 1 PE antes de um ataque corpo a corpo ou teste físico para receber Vantagem.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 2
          }
        ],
        "requirementsText": "COR 2"
      },
      {
        "id": "corporeo-resistencia-natural",
        "name": "Resistência Natural",
        "desc": "Receba +3 PV permanentes. Esta Habilidade pode ser comprada apenas uma vez.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 2
          }
        ],
        "requirementsText": "COR 2"
      },
      {
        "id": "corporeo-postura-de-combate",
        "name": "Postura de Combate",
        "desc": "Se não usar sua Ação de Movimento, receba +1 DEF e RD 1 até o início do próximo Turno.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 1
          }
        ],
        "requirementsText": "COR 1"
      },
      {
        "id": "corporeo-interposicao",
        "name": "Interposição",
        "desc": "Quando um aliado a até 1,5 m for alvo de um ataque físico que você possa alcançar, use sua Reação para ocupar a linha do golpe e tornar-se o alvo. Se não houver espaço ou trajetória plausível, a Interposição não pode ser usada.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 2
          }
        ],
        "requirementsText": "COR 2, Fortitude Iniciada"
      },
      {
        "id": "corporeo-queda-preparada",
        "name": "Queda Preparada",
        "desc": "Uma vez por cena, reduza dano de queda, colisão ou deslocamento forçado em 1d6 + COR. Se permanecer consciente, pode terminar de pé.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 2
          }
        ],
        "requirementsText": "COR 2"
      },
      {
        "id": "corporeo-maos-de-sustento",
        "name": "Mãos de Sustento",
        "desc": "Uma vez por Teste Prolongado em que força, carga ou contenção física sejam centrais, uma falha próxima sua não acrescenta Pressão. A ação ainda produz um preço local coerente.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 2
          }
        ],
        "requirementsText": "COR 2"
      },
      {
        "id": "corporeo-modificacao-brutal",
        "name": "Modificação ~ Brutal",
        "desc": "No crítico, calcule o dano ×2 normalmente e então acrescente um dado base adicional da arma. É uma Modificação de Ramo, ocupa um espaço de modificação e não amplia o multiplicador crítico.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 3
          }
        ],
        "requirementsText": "COR 3, Proficiência adequada"
      },
      {
        "id": "corporeo-sequencia-fluida",
        "name": "Sequência Fluida",
        "desc": "Na primeira Sequência de dois golpes por Rodada, o primeiro ataque não sofre a penalidade de -1d20; o segundo sofre normalmente. O custo de 1 PE da Sequência permanece.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 3
          }
        ],
        "requirementsText": "COR 3"
      },
      {
        "id": "corporeo-arrastao",
        "name": "Arrastão",
        "desc": "Ao acertar com arma Média, Pesada ou Excepcional, pode empurrar o alvo 1,5 m. Ele resiste com Fortitude contra seu resultado de ataque.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 3
          }
        ],
        "requirementsText": "COR 3"
      },
      {
        "id": "corporeo-guardar-o-impacto",
        "name": "Guardar o Impacto",
        "desc": "Como Reação, gaste 2 PE para reduzir dano físico em 1d6 + COR. Não se aplica a efeitos que não possam ser interceptados pelo corpo.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 3
          }
        ],
        "requirementsText": "COR 3"
      },
      {
        "id": "corporeo-corpo-habituado",
        "name": "Corpo Habituado",
        "desc": "A primeira condição Física leve recebida em cada cena não progride quando reaplicada pela primeira vez.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 3
          }
        ],
        "requirementsText": "COR 3"
      },
      {
        "id": "corporeo-ponto-de-apoio",
        "name": "Ponto de Apoio",
        "desc": "Enquanto não tiver se deslocado desde o início do seu Turno, aliados adjacentes recebem Vantagem contra empurrões e quedas e podem tratá-lo como Cobertura Leve contra ataques que atravessem sua posição.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 3
          }
        ],
        "requirementsText": "COR 3, Fortitude Iniciada"
      },
      {
        "id": "corporeo-dilacerante",
        "name": "Dilacerante",
        "desc": "Ao gastar 1 PE, críticos corpo a corpo aplicam Sangrando se o tipo de dano puder abrir ferimento.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 4
          }
        ],
        "requirementsText": "COR 4"
      },
      {
        "id": "corporeo-quebrar-a-linha",
        "name": "Quebrar a Linha",
        "desc": "Uma vez por Rodada, ao derrubar um alvo, causar crítico ou reduzi-lo a 0 PV ou PP, gaste 1 PE e mova-se até 3 m sem provocar Reações.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 4
          }
        ],
        "requirementsText": "COR 4"
      },
      {
        "id": "corporeo-peso-do-corpo",
        "name": "Peso do Corpo",
        "desc": "Receba Vantagem contra empurrões, quedas e imobilizações. Efeitos comuns não podem deslocá-lo contra sua vontade enquanto estiver apoiado.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 4
          }
        ],
        "requirementsText": "COR 4"
      },
      {
        "id": "corporeo-muralha-humana",
        "name": "Muralha Humana",
        "desc": "Ao Bloquear um ataque com Alcance de Linha, Cone, Raio ou Aura que também alcance um aliado adjacente, gaste 1 PE: o aliado recebe a mesma redução de dano. O objeto usado no Bloqueio perde 1 PD adicional.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 4
          }
        ],
        "requirementsText": "COR 4, Fortitude Apurada"
      },
      {
        "id": "corporeo-golpe-de-ruptura",
        "name": "Golpe de Ruptura",
        "desc": "Como Ação Completa, gaste 2 PE e ataque com arma Média, Pesada ou Excepcional. O ataque ignora 2 RD e causa dano dobrado a objetos e estruturas. Não pode integrar Sequência.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 4
          }
        ],
        "requirementsText": "COR 4, Luta Apurada"
      },
      {
        "id": "corporeo-trabalho-impossivel",
        "name": "Trabalho Impossível",
        "desc": "Uma vez por sessão, execute sozinho uma etapa física que normalmente exigiria várias pessoas ou um mecanismo, desde que permaneça dentro de escala humana possível. A DT mínima é 20; falha produz condição Física grave ou Pressão adicional.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 4
          }
        ],
        "requirementsText": "COR 4"
      },
      {
        "id": "corporeo-encarnacao-do-medo",
        "name": "Encarnação do Medo",
        "desc": "Uma vez por cena, gaste 2 PE e assuma por 3 Rodadas uma presença visceral: receba +1d20 em testes Corpóreos e ignore Machucado. Ao terminar, receba 1 Tensão de Medo.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "COR 5, Equilíbrio -5 ou menor"
      },
      {
        "id": "corporeo-corpo-de-geometria",
        "name": "Corpo de Geometria",
        "desc": "Uma vez por cena, gaste 2 PE. Por 3 Rodadas, o dado escolhido em testes de COR, Fortitude e Acrobacia nunca é tratado como menor que 10; ignore penalidades de terreno instável e imprecisão física. Ao terminar, receba 1 Tensão de Conhecimento.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "COR 5, Equilíbrio +5 ou maior"
      },
      {
        "id": "corporeo-ultimo-movimento",
        "name": "Último Movimento",
        "desc": "Ao chegar a 0 PV, realize imediatamente uma Ação Padrão ou de Movimento antes de entrar em Morrendo. Uma vez por sessão.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 5
          }
        ],
        "requirementsText": "COR 5"
      },
      {
        "id": "corporeo-corpo-inadiavel",
        "name": "Corpo Inadiável",
        "desc": "Enquanto possuir ao menos 1 PV, condições Físicas não podem impedir completamente sua ação; elas ainda aplicam penalidades e consequências.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 5
          }
        ],
        "requirementsText": "COR 5"
      },
      {
        "id": "corporeo-colosso-de-passagem",
        "name": "Colosso de Passagem",
        "desc": "Uma vez por cena, escolha uma passagem de até 3 m que esteja ocupando. Enquanto não sair dela, inimigos só atravessam sua posição vencendo teste contestado contra COR + Fortitude; aliados atrás de você recebem Cobertura Parcial.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 5
          }
        ],
        "requirementsText": "COR 5, Fortitude Versada"
      },
      {
        "id": "corporeo-reserva-profunda",
        "name": "Reserva Profunda",
        "desc": "Uma vez por sessão, gaste 3 PE e recupere 2d6 + COR PV. Remova Machucado, se presente, e fique Fadigado até o fim da cena.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "COR",
            "value": 5
          }
        ],
        "requirementsText": "COR 5"
      }
    ]
  },
  {
    "id": "conscio",
    "label": "Cônscio",
    "color": "#D9D7A4",
    "nodes": [
      {
        "id": "conscio-olho-agucado",
        "name": "Olho Aguçado",
        "desc": "Uma vez por cena, depois de rolar Percepção ou Investigação, gaste 1 PE, acrescente 1d20 ao pool e refaça a escolha do dado.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 2
          }
        ],
        "requirementsText": "MEN 2"
      },
      {
        "id": "conscio-analise-rapida",
        "name": "Análise Rápida",
        "desc": "Depois de um teste bem-sucedido contra uma Ameaça, escolha DEF, ataque, mobilidade ou Habilidade. O Narrador revela uma informação operacional relevante.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 2
          }
        ],
        "requirementsText": "MEN 2"
      },
      {
        "id": "conscio-logica-em-campo",
        "name": "Lógica em Campo",
        "desc": "Ao liderar Teste Conjunto, gaste 1 PE e o bônus máximo de ajuda aumenta de +6 para +9.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 1
          }
        ],
        "requirementsText": "MEN 1"
      },
      {
        "id": "conscio-hipotese-de-trabalho",
        "name": "Hipótese de Trabalho",
        "desc": "Uma vez por cena, declare uma hipótese verificável. O primeiro teste realizado para confirmá-la ou negá-la recebe Vantagem. Se estiver errada, o Narrador ainda revela uma relação que ela não consegue explicar.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 2
          }
        ],
        "requirementsText": "MEN 2"
      },
      {
        "id": "conscio-memoria-de-procedimento",
        "name": "Memória de Procedimento",
        "desc": "Depois de concluir com sucesso uma tarefa técnica ou acadêmica, repeti-la nas mesmas condições durante a cena não exige novo teste. Se tempo, ferramentas ou risco mudarem, receba +2 em vez disso.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "MEN 2 ou ERU 2"
      },
      {
        "id": "conscio-vigilia-compartilhada",
        "name": "Vigília Compartilhada",
        "desc": "Durante guarda ou observação prolongada, escolha um aliado capaz de receber suas instruções. Ele pode usar seu resultado de Percepção se o próprio for menor; ambos compartilham a consequência de uma falha.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 1
          }
        ],
        "requirementsText": "MEN 1, Percepção Iniciada"
      },
      {
        "id": "conscio-modificacao-mira-fria",
        "name": "Modificação ~ Mira Fria",
        "desc": "Uma arma de projeção ou instrumento de precisão é adaptado para retenção de alinhamento. Mirar com ele pode ser realizado como Ação Livre uma vez por Turno. É uma Modificação de Ramo e ocupa um espaço de modificação.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "MEN 3, Pontaria Apurada ou Engenharia Iniciada"
      },
      {
        "id": "conscio-memoria-velada",
        "name": "Memória Velada",
        "desc": "Reconheça sem teste Fragmentos, Selos e Assinaturas que já tenha estudado. Cópias, falsificações ou variações ainda podem exigir análise.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 3
          }
        ],
        "requirementsText": "MEN 3"
      },
      {
        "id": "conscio-disciplina-de-vidro",
        "name": "Disciplina de Vidro",
        "desc": "Uma vez por cena, gaste 1 PE para repetir um teste de MEN ou Temperança. Deve aceitar o segundo resultado.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 3
          }
        ],
        "requirementsText": "MEN 3"
      },
      {
        "id": "conscio-precisao-cirurgica",
        "name": "Precisão Cirúrgica",
        "desc": "Ataque Concentrado reduz o aumento de DT de +5 para +3.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 3
          }
        ],
        "requirementsText": "MEN 3, Pontaria Apurada"
      },
      {
        "id": "conscio-mapa-de-consequencias",
        "name": "Mapa de Consequências",
        "desc": "Antes de um Teste Prolongado, o Narrador informa duas consequências prováveis de alcançar a Pressão máxima.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 3
          }
        ],
        "requirementsText": "MEN 3"
      },
      {
        "id": "conscio-instrucao-breve",
        "name": "Instrução Breve",
        "desc": "Uma vez por Rodada, quando um aliado a até 6 m declarar uma ação que possa compreender, use sua Reação e gaste 1 PE para conceder +2 ao teste. Se a ação falhar por 5 ou mais, você compartilha uma consequência ou Pressão coerente.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 3
          }
        ],
        "requirementsText": "MEN 3, Tática Iniciada"
      },
      {
        "id": "conscio-ponto-cego",
        "name": "Ponto Cego",
        "desc": "Ataques de projeção ignoram Cobertura Parcial. Cobertura Sólida continua aplicando seus efeitos.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 4
          }
        ],
        "requirementsText": "MEN 4"
      },
      {
        "id": "conscio-fortaleza-mental",
        "name": "Fortaleza Mental",
        "desc": "Receba +1d20 em resistências a Tramas e efeitos que reescrevam memória, percepção ou raciocínio.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 4
          }
        ],
        "requirementsText": "MEN 4"
      },
      {
        "id": "conscio-plano-de-costura",
        "name": "Plano de Costura",
        "desc": "Quando o grupo resolver um Ponto de Costura, gaste 2 PE e escolha um aliado: ele recupera 2 PE ou remove uma condição leve.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 4
          }
        ],
        "requirementsText": "MEN 4"
      },
      {
        "id": "conscio-cadeia-de-causa",
        "name": "Cadeia de Causa",
        "desc": "Depois de um sucesso excepcional em Investigação ou Lógica, escolha uma ação diretamente sustentada pela descoberta. Aliados recebem +2 nessa ação até o fim da cena. Uma vez por cena.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 4
          }
        ],
        "requirementsText": "MEN 4, Investigação Apurada"
      },
      {
        "id": "conscio-mente-paralela",
        "name": "Mente Paralela",
        "desc": "Pode manter uma tarefa técnica ou intelectual Prolongada enquanto realiza Ações de Movimento e ações breves. Testes feitos enquanto divide a atenção recebem -1d20; falhar acrescenta Pressão a ambas as frentes.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 4
          }
        ],
        "requirementsText": "MEN 4, Concentração Apurada"
      },
      {
        "id": "conscio-diagnostico-em-movimento",
        "name": "Diagnóstico em Movimento",
        "desc": "Uma vez por Rodada, quando uma Ameaça usar pela primeira vez um ataque, Reação ou Habilidade, gaste 1 PE e sua Reação para realizar Análise Rápida imediatamente.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 4
          }
        ],
        "requirementsText": "MEN 4, Análise Rápida"
      },
      {
        "id": "conscio-instinto-cartografado",
        "name": "Instinto Cartografado",
        "desc": "Uma vez por cena, quando uma Ameaça o escolher como alvo, identifique imediatamente seu maior VT, Deslocamento e uma Reação. Por 3 Rodadas, receba +1d20 para resistir ou agir contra ela. Ao terminar, receba 1 Tensão de Medo.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "MEN 5, Equilíbrio -5 ou menor"
      },
      {
        "id": "conscio-olho-da-chama-fria",
        "name": "Olho da Chama Fria",
        "desc": "Uma vez por sessão, formule uma pergunta objetiva sobre a cena, objeto ou padrão presente. O Narrador responde com uma verdade clara, limitada ao que a realidade contém ali. Custa 2 PS e concede 1 Tensão de Conhecimento.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "MEN 5, Equilíbrio +5 ou maior"
      },
      {
        "id": "conscio-arquivo-vivo",
        "name": "Arquivo Vivo",
        "desc": "Informações estudadas com tempo suficiente não exigem teste para serem recordadas. Quando não sabe algo, reconhece ao menos que tipo de fonte poderia responder.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 5
          },
          {
            "attr": "ERU",
            "value": 4
          }
        ],
        "requirementsText": "MEN 5, ERU 4"
      },
      {
        "id": "conscio-precisao-irreversivel",
        "name": "Precisão Irreversível",
        "desc": "Depois de Mirar, gaste 2 PE e a Margem de Ameaça do próximo ataque de projeção torna-se 18~20.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 5
          }
        ],
        "requirementsText": "MEN 5, Pontaria Versada"
      },
      {
        "id": "conscio-plano-inevitavel",
        "name": "Plano Inevitável",
        "desc": "Uma vez por sessão, após ao menos um minuto de planejamento, crie três Preparações. Um aliado pode gastar uma Preparação depois de rolar para receber +3 ou transformar falha por 1 a 4 em sucesso com preço. Preparações não usadas terminam quando a cena muda.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 5
          }
        ],
        "requirementsText": "MEN 5, Tática Versada"
      },
      {
        "id": "conscio-nomear-a-regra",
        "name": "Nomear a Regra",
        "desc": "Depois de observar duas ocorrências do mesmo efeito sobrenatural, gaste 2 PE e declare a regra que acredita organizá-lo. O Narrador confirma o núcleo correto ou aponta a evidência que o contradiz. Até o fim da cena, o grupo recebe Vantagem para resistir ou explorar essa regra. Uma vez por cena.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "MEN",
            "value": 5
          }
        ],
        "requirementsText": "MEN 5, Investigação Versada"
      }
    ]
  },
  {
    "id": "cinetico",
    "label": "Cinético",
    "color": "#4F6E5D",
    "nodes": [
      {
        "id": "cinetico-passo-silencioso",
        "name": "Passo Silencioso",
        "desc": "Uma vez por cena, gaste 1 PE e receba Vantagem em Furtividade ou Acrobacia ligada a deslocamento.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 2
          }
        ],
        "requirementsText": "INS 2"
      },
      {
        "id": "cinetico-tempo-de-reacao",
        "name": "Tempo de Reação",
        "desc": "Receba +2 em Iniciativa. Em empate, age antes de quem não possui esta Habilidade.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 1
          }
        ],
        "requirementsText": "INS 1"
      },
      {
        "id": "cinetico-presenca-magnetica",
        "name": "Presença Magnética",
        "desc": "Uma vez por cena, gaste 1 PE e acrescente 1d20 a um teste de Diplomacia, Persuasão ou Intimidação depois de rolar.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "PRE",
            "value": 2
          }
        ],
        "requirementsText": "PRE 2"
      },
      {
        "id": "cinetico-maos-rapidas",
        "name": "Mãos Rápidas",
        "desc": "Uma vez por Turno, saque, guarde, troque ou utilize um item simples como Ação Livre. Operações técnicas ou complexas ainda exigem sua ação normal.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 2
          }
        ],
        "requirementsText": "INS 2"
      },
      {
        "id": "cinetico-impulso",
        "name": "Impulso",
        "desc": "Uma vez por cena, gaste 1 PE para acrescentar 3 m a uma Ação de Movimento e ignorar os primeiros 1,5 m de Terreno Difícil.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 2
          }
        ],
        "requirementsText": "INS 2"
      },
      {
        "id": "cinetico-janela-de-acao",
        "name": "Janela de Ação",
        "desc": "Quando um aliado a até 6 m falhar por 1 a 4 e você puder intervir física ou socialmente, use sua Reação para acrescentar +2. Se o resultado virar sucesso, você entra na exposição ou consequência da ação. Uma vez por cena.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "INS 2 ou PRE 2"
      },
      {
        "id": "cinetico-modificacao-furtiva",
        "name": "Modificação ~ Furtiva",
        "desc": "Uma arma ou instrumento reduz drasticamente ruído, clarão e sinais de uso. Ataques ainda podem ser percebidos pelo impacto e pelo alvo. É uma Modificação de Ramo e ocupa um espaço de modificação.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "INS 3, Engenharia ou Intrusão Iniciada"
      },
      {
        "id": "cinetico-leitura-de-sala",
        "name": "Leitura de Sala",
        "desc": "Uma vez por cena, teste Intuição DT 15. Em sucesso, identifique a relação de maior Tensão presente e quem tenta escondê-la.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "PRE",
            "value": 3
          }
        ],
        "requirementsText": "PRE 3"
      },
      {
        "id": "cinetico-esquiva-instintiva",
        "name": "Esquiva Instintiva",
        "desc": "Depois de usar Esquiva com sucesso, mova 1,5 m sem provocar Reações.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 3
          }
        ],
        "requirementsText": "INS 3"
      },
      {
        "id": "cinetico-movimento-concluido",
        "name": "Movimento Concluído",
        "desc": "Uma vez por Rodada, gaste 1 PE e termine até 3 m de um deslocamento interrompido por reação, dano ou terreno.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 3
          }
        ],
        "requirementsText": "INS 3"
      },
      {
        "id": "cinetico-disfarce-reflexivo",
        "name": "Disfarce Reflexivo",
        "desc": "Pode usar INS em Encenação quando a atuação depende de postura, ritmo, respiração ou imitação física.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 3
          }
        ],
        "requirementsText": "INS 3"
      },
      {
        "id": "cinetico-acesso-de-oportunidade",
        "name": "Acesso de Oportunidade",
        "desc": "Quando uma criatura a até 3 m abandonar voluntariamente uma posição, gaste 1 PE e sua Reação para ocupar o espaço deixado, movendo-se até 1,5 m sem provocar Reações.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 3
          }
        ],
        "requirementsText": "INS 3"
      },
      {
        "id": "cinetico-sombra-viva",
        "name": "Sombra Viva",
        "desc": "Pode tentar Ocultar-se sem cobertura total quando houver distração, multidão, iluminação irregular ou arquitetura complexa. DT mínima 20.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 4
          }
        ],
        "requirementsText": "INS 4, Furtividade Apurada"
      },
      {
        "id": "cinetico-voz-do-amalgama",
        "name": "Voz do Amálgama",
        "desc": "Uma vez por cena, use PRE no lugar de outro Atributo em interação social, explicando como sua identidade sustenta a abordagem.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "PRE",
            "value": 4
          }
        ],
        "requirementsText": "PRE 4"
      },
      {
        "id": "cinetico-contra-golpe",
        "name": "Contra-Golpe",
        "desc": "Contra-ataques não sofrem a penalidade de -1d20.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 4
          }
        ],
        "requirementsText": "INS 4, Luta Apurada"
      },
      {
        "id": "cinetico-acao-em-passagem",
        "name": "Ação em Passagem",
        "desc": "Uma vez por Turno, durante seu deslocamento, abra, feche, entregue, recolha ou acione um objeto simples sem gastar ação adicional. Um mecanismo complexo ainda exige teste e ação apropriados.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 4
          }
        ],
        "requirementsText": "INS 4"
      },
      {
        "id": "cinetico-reposicao-instantanea",
        "name": "Reposição Instantânea",
        "desc": "Quando um aliado a até 3 m for alvo de um ataque, use sua Reação e gaste 1 PE para trocar de posição com ele antes da resolução. O ataque passa a alvejá-lo se continuar válido.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 4
          }
        ],
        "requirementsText": "INS 4, Reflexo Apurado"
      },
      {
        "id": "cinetico-presenca-de-multidao",
        "name": "Presença de Multidão",
        "desc": "Uma ação social dirigida a uma pessoa pode alcançar um pequeno grupo coeso ao aumentar a DT em +5. Cada alvo ainda reage conforme seus próprios Vínculos e Limites.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "PRE 4, Diplomacia ou Persuasão Apurada"
      },
      {
        "id": "cinetico-cacada-sem-distancia",
        "name": "Caçada sem Distância",
        "desc": "Uma vez por cena, escolha uma presença percebida. Por 3 Rodadas, ignore Terreno Difícil e Reações ao mover-se em direção a ela; o primeiro ataque após mover ao menos 3 m recebe +1d20. Ao terminar, receba 1 Tensão de Medo.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "INS 5, Equilíbrio -5 ou menor"
      },
      {
        "id": "cinetico-frequencia",
        "name": "Frequência",
        "desc": "Uma vez por cena social, um resultado natural inferior a 15 em teste de PRE pode ser tratado como 15 antes de bônus. Não funciona contra manifestações sem Tessitura Social reconhecível. Receba 1 Tensão de Conhecimento.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "PRE 5, Equilíbrio +5 ou maior"
      },
      {
        "id": "cinetico-entre-os-fios",
        "name": "Entre os Fios",
        "desc": "Uma vez por sessão, gaste 2 PE e evite automaticamente um ataque ou efeito de Trama que pudesse perceber. Depois, receba 1 Tensão na direção da Natureza envolvida.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 5
          }
        ],
        "requirementsText": "INS 5"
      },
      {
        "id": "cinetico-passo-ausente",
        "name": "Passo Ausente",
        "desc": "Durante uma Ação de Movimento, gaste 2 PE e atravesse espaços ocupados, Terreno Difícil e zonas de ameaça sem provocar Reações. Não permite atravessar barreiras sólidas.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 5
          }
        ],
        "requirementsText": "INS 5"
      },
      {
        "id": "cinetico-momento-roubado",
        "name": "Momento Roubado",
        "desc": "Uma vez por sessão, depois que qualquer participante terminar o Turno, gaste 3 PE para realizar imediatamente um Turno completo. Você perde seu próximo Turno normal e não pode Preparar ou Atrasar durante o Turno roubado.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [
          {
            "attr": "INS",
            "value": 5
          }
        ],
        "requirementsText": "INS 5"
      },
      {
        "id": "cinetico-centro-movel",
        "name": "Centro Móvel",
        "desc": "Uma vez por cena, por 3 Rodadas, sempre que mover ao menos 3 m escolha um aliado a até 6 m: ele move 1,5 m sem provocar Reações ou recebe +1 DEF até o início do próximo Turno. Apenas um aliado por Rodada.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "PRE 5 ou INS 5"
      }
    ]
  },
  {
    "id": "canalizado",
    "label": "Canalizado",
    "color": "#716B7B",
    "nodes": [
      {
        "id": "canalizado-fio-estavel",
        "name": "Fio Estável",
        "desc": "Depois de falhar por até 2 num teste de Canalização de Repuxo, gaste 1 PE para transformar a falha em sucesso. A Pressão da Puxagem e qualquer custo já sofrido permanecem.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Canalização Iniciada"
      },
      {
        "id": "canalizado-reserva-de-veu",
        "name": "Reserva de Véu",
        "desc": "Receba +2 PE permanentes. Esta Habilidade pode ser comprada apenas uma vez.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Canalização Iniciada"
      },
      {
        "id": "canalizado-leitura-rapida",
        "name": "Leitura Rápida",
        "desc": "Com uma Ação Padrão, teste Canalização DT 12 para identificar Natureza e Domínio predominantes de um Fragmento ou Dobra visível.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Canalização Iniciada"
      },
      {
        "id": "canalizado-costura-antecipada",
        "name": "Costura Antecipada",
        "desc": "Escolha uma Trama conhecida ao fim de um Interlúdio. Seu primeiro uso após ele reduz o custo em 1 PE.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Canalização Iniciada"
      },
      {
        "id": "canalizado-ritmo-de-puxagem",
        "name": "Ritmo de Puxagem",
        "desc": "Uma vez por cena, depois de falhar no teste de Temperança da Puxagem, refaça-o e aceite o segundo resultado.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Canalização e Temperança Iniciadas"
      },
      {
        "id": "canalizado-relaxamento-consciente",
        "name": "Relaxamento Consciente",
        "desc": "Ao encerrar voluntariamente uma Trama sustentada por ao menos uma Rodada, recupere 1 PE. Uma vez por cena.",
        "cost": 1,
        "minRank": 0,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Canalização e Concentração Iniciadas"
      },
      {
        "id": "canalizado-modificacao-condutor-de-assinatura",
        "name": "Modificação ~ Condutor de Assinatura",
        "desc": "Durante um Interlúdio, adapte uma arma ou objeto para uma Natureza e Domínio conhecidos. Ao usá-lo como foco de Trama compatível, reduza a DT de Canalização em 1. Apenas um Condutor seu pode estar ativo; é uma Modificação de Ramo e ocupa um espaço de modificação.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 25, Canalização Apurada e Engenharia Iniciada"
      },
      {
        "id": "canalizado-trama-dupla",
        "name": "Trama Dupla",
        "desc": "Pode sustentar duas Tramas simultaneamente. Pague o custo de sustentação de ambas.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 25"
      },
      {
        "id": "canalizado-ancoragem-pessoal",
        "name": "Ancoragem Pessoal",
        "desc": "Durante 10 minutos de quietude e prática, gaste 1 PE, recupere 2 PA e reduza 1 Tensão em direção a 0. Uma vez por Interlúdio.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 25, Convicção Iniciada"
      },
      {
        "id": "canalizado-tracao-natural",
        "name": "Tração Natural",
        "desc": "Depois de falhar por até 2 num teste de Canalização de Tração, gaste 2 PE para transformar a falha em sucesso. A Pressão da Puxagem e qualquer custo já sofrido permanecem.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 25, Canalização Apurada"
      },
      {
        "id": "canalizado-assinatura-guiada",
        "name": "Assinatura Guiada",
        "desc": "Ao usar Fragmento compatível, a redução de DT aumenta de -2 para -3.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 25"
      },
      {
        "id": "canalizado-selo-portatil",
        "name": "Selo Portátil",
        "desc": "Durante 10 minutos, gaste 2 PE para preparar um objeto contra uma Assinatura conhecida. A primeira resistência do portador contra essa Assinatura recebe +3 ou reduz uma consequência Comum em um grau; depois, o Selo perde função.",
        "cost": 2,
        "minRank": 25,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 25, Canalização Apurada"
      },
      {
        "id": "canalizado-selador-nato",
        "name": "Selador Nato",
        "desc": "Pode liderar Selagem sem teste preliminar para compreender o procedimento. O Diagnóstico da Dobra ainda precisa ser realizado.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 50, Canalização Apurada"
      },
      {
        "id": "canalizado-absorcao-de-refluxo",
        "name": "Absorção de Refluxo",
        "desc": "Uma vez por sessão, gaste 2 PE e reduza um Refluxo em um grau: Crítico para Severo ou Severo para Comum.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 50"
      },
      {
        "id": "canalizado-assinatura-composta",
        "name": "Assinatura Composta",
        "desc": "Ao usar Fragmento, pode alterar a expressão de uma Trama compatível sem aumentar a DT, desde que o efeito principal permaneça.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 50"
      },
      {
        "id": "canalizado-tecitura-encadeada",
        "name": "Tecitura Encadeada",
        "desc": "Depois de uma Trama bem-sucedida, a próxima Trama compatível tecida por um aliado antes do início do seu próximo Turno reduz a DT em 2. Uma vez por Rodada.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 50, Canalização Apurada"
      },
      {
        "id": "canalizado-costura-de-emergencia",
        "name": "Costura de Emergência",
        "desc": "Como Ação Completa, gaste 2 PE e teste Canalização contra a DT da Dobra para suprimir um Pulso ou efeito territorial até o início do seu próximo Turno. Falha produz Refluxo Severo. Uma vez por cena.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 50, Canalização Versada"
      },
      {
        "id": "canalizado-fragmento-responsivo",
        "name": "Fragmento Responsivo",
        "desc": "Um Fragmento preparado pode guardar duas Tramas compatíveis em vez de uma. Ativar a segunda opção reduz sua Integridade em 1 ponto adicional.",
        "cost": 3,
        "minRank": 50,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 50"
      },
      {
        "id": "canalizado-mergulho-no-inverso",
        "name": "Mergulho no Inverso",
        "desc": "Uma vez por cena, teça uma Trama de Medo como se tivesse uma Intensidade acima, sem aumentar custo ou DT de Canalização. A DT da Puxagem aumenta em 5; depois, receba 1 Tensão de Medo e sofra Refluxo Comum mesmo em sucesso. Estiramento não sobe para uma quarta Intensidade: em vez disso, amplia apenas um parâmetro autorizado pelo Narrador.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 75, Canalização Versada, Equilíbrio -5 ou menor"
      },
      {
        "id": "canalizado-arquivo-de-fios",
        "name": "Arquivo de Fios",
        "desc": "Uma vez por cena, depois de tecer Trama de Conhecimento, preserve-a por 3 Rodadas sem pagar sustentação. O efeito ainda pode ser rompido por sua regra normal. Receba 1 Tensão de Conhecimento.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 75, Canalização Versada, Equilíbrio +5 ou maior"
      },
      {
        "id": "canalizado-tocar-o-fluxo",
        "name": "Tocar o Fluxo",
        "desc": "Pode aprender e tecer Tramas de Fluxo. A primeira exige também um acontecimento narrativo de contato temporal.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 75, Equilíbrio entre -2 e +2"
      },
      {
        "id": "canalizado-estiramento-interno",
        "name": "Estiramento Interno",
        "desc": "Uma vez por sessão, teça Estiramento sem Fragmento, Dobra ou auxílio externo. Depois, sofra Refluxo Comum mesmo em sucesso.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 75, Canalização Versada"
      },
      {
        "id": "canalizado-pacificacao",
        "name": "Pacificação",
        "desc": "Ao concluir uma Selagem de Âncora, pode tentar transformá-la diretamente em Revérbero sem etapa adicional, se todos os Pontos de Costura essenciais tiverem sido resolvidos.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 75"
      },
      {
        "id": "canalizado-mao-no-retorno",
        "name": "Mão no Retorno",
        "desc": "Uma vez por sessão, quando Refluxo surgir a até 6 m, use sua Reação e gaste 2 PE para tornar-se o centro da consequência. Se aceitar todos os custos diretos de PV, PS e Tensão, reduza o Refluxo em um grau; caso contrário, pode apenas redistribuí-los entre você e o alvo original.",
        "cost": 4,
        "minRank": 75,
        "requires": [],
        "attrReqs": [],
        "requirementsText": "Rank 75"
      }
    ]
  }
];

