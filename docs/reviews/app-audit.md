# Something.reader — auditoria de arquitetura, produto e interface

Auditoria iniciada em 05/09/2026 e consolidada em 06/09/2026. Base: `f75539f1e114fa75019f1774de8d370293ff77b6`, versão 0.2.0. Objetivo acordado: revisão crítica completa para um produto público em desktop e celular.

## Diagnóstico

**A base é aproveitável, mas o app ainda precisa de consolidação antes de uma publicação ampla.** O modelo de documento, o motor independente de React e os tokens visuais são boas escolhas. Os principais problemas estão nas transições entre recursos: atualização do banco, recarga durante leitura, navegação enquanto se escuta e preparação de voz.

Não há justificativa encontrada para trocar React/Vite ou reescrever o projeto. Há justificativa para corrigir a persistência, centralizar o ciclo de vida da sessão de leitura e tornar as capacidades reais do app visíveis na interface.

| Frente | Avaliação | Evidência principal |
| --- | --- | --- |
| Arquitetura e manutenção | Base boa; integração precisa de revisão | Core sem React, contratos de storage/voz; hooks importam IndexedDB diretamente e não encerram todos os recursos |
| Correção funcional | Não pronta para publicação ampla | Perda de posição em recarga e migração que esconde documentos |
| Segurança e privacidade | Requer correções antes de ampliar exposição | Guarda de IP aceita IPv4 privado normalizado como IPv6; vozes remotas não são diferenciadas |
| Desempenho | Medição incompleta; riscos concretos de ciclo de vida | Workers de voz sem descarte no fechamento; buffers grandes; preparação sem limite de espera |
| Interface e acessibilidade | Identidade consistente; obstáculos de uso | Título sobreposto em 414 px, âncora de baixo contraste em Paper, menus incompletos por teclado |
| Qualidade da validação | Bom começo no core; lacunas de integração | 134 testes passam, mas não cobrem as transições que falharam no navegador |

O que preservar: importação sem conta, amostra utilizável, busca simples, temas Ink/Dim/Paper, tipografia de leitura, posição compartilhada entre modos, IDs determinísticos e processamento pesado em workers. A rejeição de scripts na extração textual e a validação por salto do proxy são boas defesas, embora a guarda de endereços precise de correção.

## Cobertura e limites

Foram inspecionados modelo, engine, importadores, armazenamento, voz, service worker, telas, componentes e documentação. A aplicação foi exercitada em Chrome/macOS, em desenvolvimento (`127.0.0.1:5174`) e no build servido (`127.0.0.1:4174`), com viewports de 1440×1000 e 414×896. Os três temas foram capturados. Capturas em `evidence/` podem incluir um controle da extensão Merlin; ele não pertence ao app e não entra nos achados.

Foram exercitados onboarding, amostra, colagem de Markdown, biblioteca, busca sem resultado, reimportação da amostra, leitura tradicional, Focus, seleção de capítulo, aparência, recarga, link público controlado e tentativa de voz. A reabertura offline e a leitura de texto existente funcionaram após aquecimento do app. Isso não comprova a primeira instalação offline, todas as importações offline, atualização entre versões ou voz offline.

O seletor de arquivos abriu, mas a extensão recusou `setFiles` por falta de acesso a URLs de arquivo. Portanto, EPUB/DOCX contam com testes do core, não com aceite E2E nesta auditoria. O teste direto de PDF em Bun falhou por ausência de `DOMMatrix`; isso é uma limitação desse ambiente de teste, não prova de que PDF falha no navegador. PDF real, PDF escaneado, arquivo inválido via UI, drag-and-drop, aparelho móvel real e leitor de tela permanecem sem validação final. Nenhum dado pessoal foi usado; os documentos de auditoria são sintéticos ou a amostra do projeto.

Quality gate final: `bun test` passou com **134 testes / 0 falhas**; `bun run build` passou com typecheck. O build mantém um aviso de importação simultaneamente estática e dinâmica de Markdown; não é uma falha de compilação. Logs: [testes](evidence/unit-tests.txt) e [build](evidence/build.txt). Os links locais e formatos/dimensões das capturas também foram verificados.

**Tipos de evidência:** navegador = comportamento observado; probe = execução isolada contra código real; estática = caminho identificado no código, ainda sem reprodução E2E; design = julgamento de experiência, não resultado de pesquisa com usuários. Gravidade P1 = corrigir antes de ampliar uso; P2 = próxima consolidação; P3 = manutenção/evolução. Nenhum P0 foi estabelecido.

## Achados prioritários

### A01 · P1 · A leitura contínua pode perder todo o progresso desde a última pausa

**Navegador + estática.** Colar um documento com título e 1.200 repetições de `palavra`, iniciar a leitura a 300 WPM e recarregar durante reprodução. A posição observada antes da recarga foi **52**; ao reabrir pela biblioteca foi **0**. Já a posição 154 da amostra, após seleção de capítulo e tempo ocioso, persistiu corretamente.

Em `src/app/hooks/useEngine.ts:33`, cada snapshot cancela o timer de 400 ms. Atualizações mais frequentes impedem a gravação até haver uma pausa. O cleanup do efeito não é uma garantia de gravação ao recarregar a página. **Correção:** checkpoint periódico com limite máximo de atraso, flush em pausa/saída e tratamento de `visibilitychange`/`pagehide`; exibir falhas de persistência. Aceite: reprodução longa, recarga e reabertura mantêm a posição dentro do intervalo de checkpoint definido.

### A02 · P1 · A migração para o storage v2 torna a biblioteca antiga invisível

**Probe + histórico.** O layout v1 do commit `64ef67e` tinha documents, positions e settings. O upgrade em `src/core/storage/idb.ts:20` cria `library` vazio; `listLibrary` passa a ler somente esse índice. O probe preservou um documento, mas retornou zero itens visíveis. Os bytes do documento não foram apagados: perderam o caminho de acesso pela biblioteca.

**Correção:** migração versionada que reconstrói índice e campos derivados dos documentos antigos; incluir reparo para quem já chegou à v2 com índice vazio. Não basta alterar somente o upgrade v1→v2. Testar documentos e posições legados, v2 já afetada e reexecução idempotente. Evidência: [probes.json](evidence/probes.json).

### A03 · P1 · A guarda de IP do proxy aceita endereços privados em IPv6 normalizado

**Probe + estática.** `new URL('http://[::ffff:127.0.0.1]/').hostname` produz `[::ffff:7f00:1]`. `isBlockedIp` retorna false para essa forma, assim como para metadata link-local e rede privada normalizados. O padrão em `vite-plugin-fetch.ts:50` reconhece apenas o sufixo decimal pontuado; `resolvePublic` usa a forma já normalizada.

**Impacto:** contorna a restrição de destino do importador local para quem pode chamar o endpoint. A barreira same-origin continua existindo; não se está alegando exploração remota sem condições. Não foram feitas requisições a serviços internos. **Correção:** normalizar IPv4 mapeado antes da classificação, testar a entrada passando por `URL` e manter pinning DNS, revalidação de redirects, timeout e limites. Não publicar o proxy como serviço aberto. Evidência: [probe reproduzível](evidence/reproduce.ts).

### A04 · P1 · A voz não alcançou reprodução verificável no percurso testado

**Navegador; causa ainda não isolada.** No build, o progresso passou por 20%, 65% e 86%. Depois de desaparecer o progresso, uma nova tentativa permaneceu em `reading...`, posição 0, em observações sucessivas ao longo de vários minutos. Não houve erro útil no dock. Não houve confirmação de saída sonora: a captura de tela e a posição imóvel não permitem certificar áudio.

O primeiro play em desenvolvimento também provocou recarga do Vite ao otimizar `onnxruntime-web`, encerrando a sessão; esse evento foi confirmado no log do servidor e é específico do desenvolvimento. O build emite um WASM de aproximadamente 27,8 MB; isso não comprova sua inicialização correta.

Na retomada da auditoria em 06/09, uma tentativa offline após reabrir a amostra também permaneceu em `reading...`, posição 0. A saída sonora segue não aprovada; não atribuir a falha exclusivamente à rede ou ao backend sem instrumentação. Registro: [estado offline](evidence/offline-voice-state.txt).

**Correção:** distinguir download, inicialização, síntese e reprodução; limitar a espera de cada etapa e permitir retry. Instrumentar localmente worker e saída de áudio sem registrar texto lido. Verificar compatibilidade entre JS/WASM, desbloqueio do AudioContext e execução serial das sessões. O código pede WebGPU, mas importa a entrada padrão: a [documentação oficial do ONNX](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html) orienta usar a entrada `onnxruntime-web/webgpu`. É uma pista técnica, não a causa comprovada do travamento. Evidência: [estado da voz](evidence/voice-after-preparation.png).

### A05 · P1 · A promessa de voz sempre local não é garantida pelo provedor do sistema

**Estática.** `src/core/voice/system.ts:99` captura `localService`, mas a lista e a seleção não excluem vozes remotas nem as identificam ao usuário. `localService=false` indica serviço remoto segundo a [documentação da API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService). A interface descreve as vozes como instaladas no dispositivo. Não foi demonstrada transmissão de texto nesta sessão.

**Correção:** para preservar a proposta atual, listar e selecionar apenas vozes locais; informar indisponibilidade quando não houver uma compatível. Usar o idioma detectado quando nenhuma voz explícita for escolhida: hoje `SpeakOptions.lang` não é aplicado nesse caminho. Não alternar silenciosamente para um serviço remoto. Também ajustar “Nothing leaves this machine” para distinguir documentos locais das requisições de importação web e download do modelo.

### A06 · P1 · Falha ao abrir o armazenamento não tem recuperação na tela inicial

**Estática.** `src/app/providers/SettingsProvider.tsx:24` só marca `loaded` no sucesso; `App` devolve um `div.boot` enquanto espera. Um erro de IndexedDB deixa o app sem uma ação de recuperação. Abertura de documentos, atualização da biblioteca e gravação de preferências também têm promises sem tratamento no nível da UI.

**Correção:** estado explícito de erro com retry; não substituir dados por biblioteca vazia nem mostrar sucesso em escrita malsucedida. Acrescentar testes com armazenamento negado, quota esgotada e falha de transação. Esse cenário não foi induzido no banco real do navegador do usuário.

## Leitura, interface e voz: próxima consolidação

| ID / gravidade | Evidência e efeito | Correção e aceite |
| --- | --- | --- |
| A07 / P2 — capítulo não rola o texto | Navegador: na amostra em Read, selecionar “The deal” moveu o slider para 154, mas “Read something.” permaneceu no topo. `Reader.tsx:430` restaura scroll apenas uma vez por documento | Distinguir seek explícito de scroll do usuário; capítulo/slider devem trazer o destino para a área legível sem mudar o modo |
| A08 / P2 — seek não reposiciona a narração | Estática: capítulo, slider e teclas chamam somente o engine (`Reader.tsx:207`, `:260`); a cadeia de voz mantém seu índice e callbacks | Um comando de seek cancela a frase anterior e retoma no destino quando ativo; não iniciar áudio se estava parado |
| A09 / P2 — recursos de voz não têm dono até o descarte | Estática + probe: `stop()` limpa áudio/cache, mas não termina worker, fecha AudioContext ou cancela jobs. O hook só chama stop ao desmontar. Remoção do pacote cria outra instância | Descarte explícito e idempotente; invalidar callbacks, resolver/rejeitar pendências e liberar worker/contexto. Reabrir repetidamente não acumula recursos |
| A10 / P2 — cache de áudio ignora opções | Probe: mesmo índice com F1/1x/pt e depois M2/2x/en gera somente o primeiro pedido (`provider.ts:150`). No fluxo atual configurações exigem sair do leitor, o que reduz a exposição imediata | Chave com identidade do conteúdo, voz, idioma e velocidade; teste independente do provedor |
| A11 / P2 — parar e preparar têm estados contraditórios | Navegador: Stop voltou a Read, mas a mensagem reapareceu em 86%. `useVoice.ts:121` não invalida callback de preparação | Separar pausa de reprodução de cancelamento do download; progresso de execução antiga não pode alterar a sessão nova |
| A12 / P2 — “Download” não é ação | Navegador + estática: configurações mostram um `span` em `SettingsScreen.tsx:197`; não existe handler de download | Botão funcional com progresso, cancelar e retry. “System default” não deve nomear a voz padrão do motor Natural |
| A13 / P2 — título fica sob botões no celular | Captura em 414 px: ações cobrem o título. Colunas simétricas com mínimos zero e colapso somente abaixo de 380 px (`screens.css:629`) | Reservar largura real para controles, truncar título no espaço restante e recolher ações antes da colisão; testar 360, 379, 380, 414 e 1440 px |
| A14 / P2 — âncora sem contraste em Paper | Captura + cálculo: `#E8A33D` sobre `#F7F4EE` = 1,96:1. A cor fixa substitui o accent adaptado ao tema (`SettingsProvider.tsx:35`) | Derivar cor acessível por tema ou restringir combinações; 3:1 para texto grande e 4,5:1 para texto normal, conforme [WCAG](https://www.w3.org/TR/WCAG22/#contrast-minimum) |
| A15 / P2 — teclado não acompanha semântica dos seletores | Navegador: ArrowDown no menu Font manteve o foco no gatilho. `Menu`, `Segmented` e `WheelPicker` têm papéis listbox/radio, mas faltam interações de setas e foco correspondente | Usar controles nativos ou implementar padrão completo. Restringir atalhos do leitor enquanto um modal está aberto; testar Tab, setas, Enter, Space e Escape |
| A16 / P2 — link é oferecido em build onde não funciona | Navegador: example.com importou no dev; no preview retornou instrução para rodar `bun run dev`. Plugin só usa `configureServer` | Expor capacidade por ambiente. No build estático, retirar ação indisponível e oferecer colagem; habilitar link somente com backend suportado |
| A17 / P2 — instalação offline é parcial e sem indicador de prontidão | Estática + sucesso parcial no browser: SW precacheia só `/`; arquivos são cacheados conforme acessados. Versão fixa e assets antigos permanecem no mesmo cache | Manifesto versionado do shell, ciclo de atualização e indicação de recursos preparados; preservar cache de voz, limitar limpeza ao namespace do app e testar primeira visita/upgrade/offline |
| A18 / P2 — limites de importação chegam tarde | Estática: `useLibrary` lê e duplica todo arquivo antes de verificar 80 MB. EPUB testa expansão depois de extrair uma entrada; DOCX não usa o limite de expansão | Verificar tamanho antes de alocar, limitar expansão/entradas e duração de jobs, disponibilizar cancelamento. Não foi executado arquivo malicioso ou teste de exaustão |

### A19 · P3 · O roadmap e as promessas não representam a implementação

`docs/product/mvp.md` ainda exclui URL e DOCX; `roadmap.md` trata recursos presentes como futuros. README anuncia build de ~3,9 MB, mas `dist` mediu ~31 MB, principalmente pelo WASM. São tamanhos em disco, não o download inicial obrigatório. `PACK.bytes` é 409.000.000, enquanto a soma do manifesto é 426.490.000; não são medições dos arquivos remotos atuais. A documentação de desenvolvimento menciona download explícito nas configurações, inexistente na UI.

**Correção:** atualizar status por capacidade e separar tamanho do shell, runtime opcional e modelo. Fixar revisão imutável dos arquivos do modelo, em vez de misturar cache duradouro com `resolve/main`. Não prometer que qualquer voz nova funcionará offline apenas porque os arquivos principais estão no cache: estilos de voz são baixados à parte.

## Matriz de funcionalidades

| Recurso | Estado auditado | Validação / lacuna |
| --- | --- | --- |
| Onboarding e amostra | Funcional, com promessas a revisar | Navegador; quatro etapas e Skip |
| Colar texto/Markdown | Funcional no percurso | Documento sintético, título, leitura e persistência |
| TXT/HTML/Markdown por arquivo | Core coberto; E2E pendente | Testes verdes; seletor bloqueado pela extensão |
| EPUB e DOCX | Core funcional em fixtures; E2E pendente | Arquivos reais nos testes; fidelidade complexa não aferida |
| PDF com texto / escaneado | Não validado E2E | Fixture existe, mas suíte não exercita o importador PDF real; execução direta em Bun sem DOMMatrix |
| Link | Funcional no dev; indisponível no build | example.com em ambos os ambientes |
| Biblioteca e busca por metadados | Funcional para dados novos | Busca vazia/sem resultado; migração antiga falha |
| Excluir documento / limpar tudo | Implementado; UI destrutiva não executada | Exclusão coberta no core; confirmação inspecionada por código |
| Leitura tradicional | Parcial | Texto legível, troca de modo; salto de capítulo não reposiciona viewport |
| Focus, ritmo e posição | Funcional com falha de continuidade | Avanço observado; recarga ativa perdeu progresso |
| Capítulos | Parcial | Menu e posição funcionam; scroll e voz não acompanham seek |
| Narração Natural | Não aprovada | Download observado; reprodução não confirmada |
| Narração System | Implementada; aceite de áudio pendente | Problemas de idioma/privacidade identificados no código |
| Aparência e temas | Funcional com defeitos | Três temas; contraste da âncora e layout móvel precisam de correção |
| Offline / PWA | Parcial | Shell aquecido e texto existente reabriram offline; instalação em aparelho real pendente |
| Marcadores / highlights persistentes | Ausentes | Realce da posição é trilha de leitura, não anotação salva |
| Coleções / busca no texto completo | Ausentes | Busca atual é por metadados |
| Backup / exportação da biblioteca | Ausentes na UI | Original armazenado, mas sem saída utilizável para usuário |
| OCR / sincronização / Tauri | Ausentes | Não necessários para consolidar a versão atual |

## Direção recomendada para produto e arquitetura

**Retomada como entrada principal.** Hoje cada recarga abre “Read now”, que na prática é uma tela de adicionar documentos. Propor biblioteca com “Continuar lendo” como entrada para quem já tem conteúdo, importação como ação sempre acessível e último documento/modo lembrados. A preferência por Text versus Focus deve ser explícita; o onboarding diz “if you want”, mas todo documento abre em Focus. Esta é recomendação de design, não resultado de teste com usuários.

**Leitura e escuta com comandos claros.** Expor Text, Focus e Listen com estado identificável, usar Play/Pause para transporte e fazer ritmo de voz aparecer quando estiver escutando. Hoje Pace e os tempos continuam baseados em WPM, mesmo quando a voz é o relógio. Reduzir o dock no modo de leitura manual; manter os controles disponíveis sem ocupar permanentemente tanta área de texto. Preservar as cores e a tipografia existentes.

**Uma sessão de leitura com adaptadores.** Criar um controlador testável de sessão que coordene engine, narrador, seek, persistência e descarte. Injetar o contrato Storage no nível da aplicação em vez de importar funções de IndexedDB em cada hook. Manter o core de domínio sem React e tratar APIs de navegador como adaptadores explícitos; a documentação atual exagera ao dizer que todo o core é independente de DOM, pois TTS e storage são adaptadores de navegador.

**Dados antes de novos formatos.** Depois dos bloqueadores, priorizar exportar/importar backup versionado e marcadores simples, pois protegem o investimento de leitura. Coleções e busca completa vêm após evidência de biblioteca maior. IA, sincronização e nova plataforma não resolvem os problemas centrais observados e não entram na primeira rodada de correções.

**Fidelidade e desempenho com corpus real.** O modelo atual guarda texto; imagens, tabelas complexas, notas e links não são preservados como num leitor de EPUB/PDF completo. Descrever o produto como leitura textual extraída até existir suporte correspondente. Medir arquivos grandes antes de escolher virtualização: o TextStage percorre todos os blocos e passa callbacks novos mesmo a componentes memoizados. Não há benchmark que sustente uma meta de desempenho para livros grandes nesta auditoria.

## Evidências e sequência de execução

- [Reprodução isolada](evidence/reproduce.ts) e [resultados](evidence/probes.json): migração, endereços normalizados, cache de voz, cancelamento, tamanho e contraste. Executar `bun docs/reviews/evidence/reproduce.ts`; usa banco em memória, não altera dados do navegador.
- [Desktop Paper](evidence/desktop-text-paper.png), [Ink](evidence/desktop-text-ink.png), [Dim](evidence/desktop-text-dim.png) e [salto de capítulo](evidence/desktop-text-chapter.png).
- [Mobile Focus Paper](evidence/mobile-focus-paper.png), [Text Paper](evidence/mobile-text-paper.png), [Text Dim](evidence/mobile-text-dim.png), [Text Ink](evidence/mobile-text-ink.png) e [configurações](evidence/mobile-settings-paper.png).
- [Voz após preparação](evidence/voice-after-preparation.png), [link no build](evidence/production-link-error.png) e [leitor offline](evidence/offline-reader.png).
- [Plano de correções](remediation-plan.md): ordem, contratos e aceite por entrega.

As correções de comportamento não foram aplicadas nesta auditoria. A aprovação para publicação exige resolver os P1 e concluir os testes E2E explicitamente pendentes; a existência deste relatório não equivale a aprovação de release.
