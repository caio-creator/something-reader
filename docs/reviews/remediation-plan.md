# Something.reader — plano de correções após auditoria

Base: [auditoria de 05–06/09/2026](app-audit.md), commit `f75539f`. Este documento especifica a execução.

> **Estado em 06/09/2026.** As cinco entregas foram executadas. O que mudou em relação à auditoria:
>
> | Achado | Estado | Onde |
> | --- | --- | --- |
> | A01 posição perdida em recarga | corrigido, com teste | `core/storage/checkpoint.ts`, `tests/checkpoint.test.ts`, E2E de recarga durante leitura |
> | A02 biblioteca invisível após upgrade | corrigido, com teste | `rebuildLibraryIndex`, `tests/migration.test.ts` |
> | A03 guarda de IP em IPv6 mapeado | corrigido, com teste | `vite-plugin-fetch.ts`, `tests/fetch-guard.test.ts`, `tests/fetch-proxy.test.ts` |
> | A04 voz sem reprodução verificável | **corrigido e confirmado** | entrada WebGPU recebia o binário `jsep` em vez do `asyncify`; [evidência](evidence/voice-confirmed.md) |
> | A05 vozes remotas | corrigido, com teste | `core/voice/system.ts`, `tests/voice-system.test.ts` |
> | A06 falha de storage sem recuperação | corrigido | estado de erro e retry em `App`, `SettingsProvider`, `useEngine`, `useLibrary` |
> | A07–A15 leitura, interface, teclado | corrigidos | ver commits `feat(ui)`, `feat(a11y)`, `fix(ui)` |
> | A16 link oferecido onde não funciona | corrigido | `core/importers/capabilities.ts` |
> | A17 instalação offline parcial | corrigido | manifesto versionado do shell, atualização controlada, prontidão em Settings |
> | A18 limites de importação tardios | corrigido, com teste | `core/importers/archive.ts`, `tests/archive-limits.test.ts`, cancelamento e timeout |
> | A19 documentação divergente | corrigido | README, MVP e roadmap com tamanhos medidos |
>
> A suíte foi de 134 para 181 testes unitários, mais 40 testes de navegador em Chromium e WebKit
> (`bun run test:e2e`), que não existiam. Esses testes encontraram um defeito que a auditoria não
> tinha visto: o sheet ficava sob a tab bar num telefone de 664 px, deixando a ação principal
> impossível de tocar.
>
> **Continua em aberto:** um aparelho iOS real e a primeira instalação offline medida num
> telefone. Nada disso é aprovação de release.

Esforço relativo: P = até um conjunto pequeno de mudanças; M = vários componentes/contratos; G = integração com múltiplos cenários. Não são estimativas de prazo.

## 1. Proteger dados e recuperar falhas — primeira entrega

**Achados:** A01, A02, A06. **Esforço:** M. **Dependências:** nenhuma.

- Substituir debounce puro da posição por checkpoint com atraso máximo de 1 segundo durante atividade, mantendo a última posição em referência. Gravar também ao pausar, sair do leitor e quando a página fica oculta. Não depender do evento de encerramento como única garantia.
- Serializar gravações por documento e ignorar resultados de leituras antigas após troca de sessão. O contador de posição continua sendo `ReadingPosition`; não criar cursor alternativo para voz.
- Criar migração de banco v3 que reconstrói `library` a partir de `documents` tanto para v1 quanto para v2 já afetada. Completar campos derivados ausentes, preservar IDs, texto e posições; fazer tudo na transação de upgrade. Tratar `versionchange` e abertura bloqueada por outra aba.
- Acrescentar estado recuperável de erro à inicialização e às operações de storage. Mostrar retry e explicar que os dados não puderam ser acessados/salvos; não limpar o banco automaticamente.
- Injetar `Storage` no nível da aplicação para testar negação de acesso e falhas de escrita sem alterar o banco do navegador.

**Aceite:** migrar fixtures v1 e v2 sem perder itens/posições; ler continuamente por pelo menos 30 segundos e recarregar, retomando dentro de 1 segundo de progresso anterior; pausar/fechar/reabrir conserva o último checkpoint; negar IndexedDB produz mensagem e retry, não tela vazia. Verificar também duas abas durante upgrade.

**Commit sugerido:** separar `fix(storage): migrate legacy library indexes`, `fix(reader): checkpoint active reading progress` e `fix(storage): recover from initialization failures`.

## 2. Fechar a lacuna do proxy e alinhar privacidade — segunda entrega

**Achados:** A03, A05, A16. **Esforço:** M. **Dependências:** nenhuma para o proxy; interface pode seguir a entrega 1.

- Canonicalizar IPv4 mapeado em IPv6 e aplicar a mesma classificação usada para IPv4. Testar formatos comprimidos/expandidos e URLs normalizadas. Preservar guarda de origem, resolução/pinning por salto, limite de tamanho e timeout.
- Fazer teste de integração com servidor HTTP controlado e injeção de transporte/resolução; não usar metadata real ou infraestrutura interna como alvo de teste.
- Na versão estática, declarar `canImportUrl=false` e oferecer colagem. No desenvolvimento, manter importação de URL habilitada. Não criar proxy público como parte desta correção.
- Para voz System, permitir somente `localService=true`, resolver voz por idioma do documento quando não houver escolha explícita e informar quando nenhuma voz local for compatível. Aplicar `utterance.lang` também no caminho padrão.
- Ajustar texto de privacidade: leitura de arquivos é local; importar URL faz uma requisição ao site; preparar voz baixa arquivos. Não enviar texto a serviço remoto como fallback.

**Interface nova:** capacidade de importação disponível à UI; seleção de voz com disponibilidade local explícita. Sem API pública nova.

**Aceite:** endereços privados mapeados são bloqueados antes do transporte; URL pública controlada funciona no dev; build não apresenta ação que exige terminal; uma voz remota simulada não aparece nem é selecionada automaticamente.

## 3. Concluir a voz e o controle de sessão — terceira entrega

**Achados:** A04, A08–A12, A19 (pacote). **Esforço:** G. **Dependências:** persistência da entrega 1 e regra de privacidade da 2.

- Introduzir controlador de sessão testável que coordena `play`, `pause`, `seek` e `dispose` entre engine e narrador. Trocar documento invalida a geração anterior; nenhum callback antigo pode falar, mover posição ou alterar erro/progresso da sessão nova.
- Acrescentar `dispose()` opcional e idempotente ao contrato `TTSProvider`, implementando descarte de worker, AudioContext e jobs. Distinguir pausa de reprodução, cancelamento de preparação e descarte. Não construir uma instância temporária para tentar encerrar o worker de outra.
- Modelar estados `idle`, `downloading`, `initializing`, `synthesizing`, `playing`, `paused` e `error`. A UI só deve dizer que está reproduzindo quando a saída de áudio começou. Configurar timeout de inatividade de download de 30 segundos, inicialização de 120 segundos e síntese de frase de 60 segundos; timeout deve liberar a operação e oferecer retry. Medir esses limites em aparelho real antes de release.
- Fixar uma revisão imutável do modelo e registrar a revisão escolhida no manifesto. Usar a entrada ONNX adequada ao backend e o WASM da mesma versão. Tentar WebGPU quando disponível e fallback WASM explícito, com diagnóstico local por etapa.
- Processar síntese em fila com a frase atual prioritária e até duas futuras antecipadas; remover jobs obsoletos da fila. Incluir identidade do segmento, idioma, voz, velocidade e configuração de síntese na chave de áudio preparado.
- Fazer seek interromper a frase atual e iniciar a frase que contém o destino se estava tocando. Se estava parado, somente posicionar. Retomada dentro da frase começa no início dela; alinhamento de palavra permanece aproximado e não é vendido como exato.
- Implementar Download nas configurações com progresso/cancelar/retry, tamanho derivado do manifesto e verificação do estilo da voz escolhida. Cancelar preparação aborta a transferência ativa, conserva arquivos completos e impede callbacks antigos. Pausar reprodução pode manter preparação em andamento, com mensagem explícita.
- Expor controles de voz junto ao leitor quando Listen estiver ativo. WPM continua exclusivo do Focus; tempos calculados a partir de WPM não devem ser apresentados como duração do áudio.

**Aceite:** primeiro play chega a saída de áudio confirmada; texto em português com números e abreviações; pelo menos dez frases consecutivas; pausa/retomada, seek, troca de documento e fechamento sem áudio tardio; erro do worker e queda de rede com retry; segunda abertura usa cache; voz escolhida reproduz offline; vinte aberturas/fechamentos não acumulam workers/contextos. Registrar navegador, backend, latência da primeira frase e método de confirmação da saída sonora. Não aceitar apenas waveform calculada ou ícone de play como prova.

## 4. Tornar leitura e navegação claras — quarta entrega

**Achados:** A07, A13–A15; recomendações de UX. **Esforço:** M. **Dependências:** comandos de sessão da entrega 3 para seek com áudio.

- Corrigir o cabeçalho com largura reservada às ações; em larguras menores que 600 px, agrupar Contents/Look/Pace em More, preservando Close e Listen. O título ocupa exclusivamente o espaço restante.
- Fazer capítulo e slider rolarem o destino para a área legível no modo Text, mantendo esse modo. Scroll manual atualiza posição sem disparar um novo scroll programático.
- Adaptar a cor de âncora ao tema, preservando a intenção da paleta; validar todas as escolhas contra o fundo real. Não depender só da cor para estado de reprodução/seleção.
- Substituir o menu de escolha por select nativo ou completar seu padrão de teclado; para esta entrega usar select nativo. Usar radios nativos nos grupos e preservar foco nos modais com callbacks estáveis. Suspender atalhos globais do leitor enquanto um modal estiver aberto.
- Manter os rótulos em inglês nesta rodada para não iniciar tradução parcial: Library, Add, Text, Focus e Listen. Usar Play/Pause para transporte. Manter a marca `something.`.
- Na reabertura com biblioteca existente, mostrar Library com Continue reading em destaque. Persistir último documento e modo de leitura, mas nunca iniciar áudio/reprodução automaticamente. Para novos documentos sem preferência, usar Text; permitir mudar e lembrar a escolha.

**Aceite:** 360/379/380/414/1440 px sem colisão de título/controles; Ink/Dim/Paper com contraste medido; navegação por teclado alcança e opera todos os controles; Escape fecha somente a camada superior; último documento e modo são recuperáveis sem iniciar reprodução. Atualizar o specimen para componentes alterados.

## 5. Fechar o aceite público — quinta entrega

**Achados:** A17–A19 e lacunas da matriz. **Esforço:** M–G. **Dependências:** entregas anteriores.

- Gerar manifesto versionado de assets do shell; apresentar prontidão offline somente quando os recursos necessários estiverem preparados. Preservar o namespace de voz, limpar apenas caches do app e limitar acúmulo de versões. Atualização não deve interromper leitura ativa.
- Validar tamanho do arquivo antes de `arrayBuffer`, aplicar limites de expansão em EPUB/DOCX e cancelamento/timeout de importação. Não usar arquivos maliciosos grandes para validar os limites: fixtures pequenas e fronteiras simuladas bastam.
- Completar E2E de EPUB, PDF com texto, PDF sem texto, DOCX, TXT, HTML e Markdown pelo worker do navegador; reimportação, arquivo inválido, drag-and-drop, erro de quota e biblioteca maior.
- Medir uma sessão de texto longo e voz em desktop e em pelo menos um aparelho móvel real; registrar Safari/iOS como pendente se não houver dispositivo, sem declarar compatibilidade testada.
- Atualizar README, MVP, roadmap e documentação técnica com status real, tamanhos separados e limites de extração textual. Criar instruções de instalação estática por HTTPS que não dependam do servidor de desenvolvimento para recursos anunciados.

**Quality gate:** `bun test`, `bun run build`, testes E2E dos cenários acima, revisão visual nos três temas e verificação da migração. Registrar resultados sem telemetria de documentos. Só então avaliar publicação; deploy não está incluído neste plano.

## Evolução posterior

Priorizar backup/exportação e restauração versionada da biblioteca, depois marcadores simples e ordenação por leitura recente. Coleções e busca completa dependem de validação com bibliotecas maiores. OCR, sincronização, IA e nova plataforma ficam fora dessas cinco entregas. Não iniciar uma migração de framework ou reescrita para corrigir os problemas identificados.
