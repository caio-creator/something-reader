# A04 — saída de áudio confirmada

Registro da verificação feita em 06/09/2026, depois da correção do binário WASM.
A auditoria recusou ícone de play e waveform calculada como prova, então foram
usados os dois métodos combinados: um gate mensurável no grafo de áudio e a
confirmação auditiva de uma pessoa.

## Ambiente

| | |
| --- | --- |
| Navegador | Chrome 152 (Chromium, headed) em macOS 25.6 |
| Servidor | `vite preview` do build de produção, `127.0.0.1:4174` |
| Backend | WebGPU disponível; **as quatro sessões ONNX criadas em WebGPU**, sem fallback |
| Modelo | `Supertone/supertonic-3`, revisão fixada `3cadd1ee`, 426.490.000 bytes |
| Documento | a amostra do projeto, "Read something." |

O desenvolvimento não serve para esta medição: no primeiro uso da voz o Vite
reotimiza `onnxruntime-web` e recarrega a página, encerrando a sessão. Isso é o
mesmo artefato que a auditoria observou, e é específico do servidor de
desenvolvimento.

## Método

**Mensurável.** Um `AnalyserNode` fica no caminho entre a fonte e o
`destination`, e não ao lado dele, então o que ele lê é o sinal que sai do
grafo. É registrado o **pico** de RMS ao longo da frase — a primeira medição
usava a primeira amostra a cruzar o limiar, que é sempre o começo da frase e
nunca a voz, e por isso relatava `0,0001` em qualquer caso. O instrumento foi
corrigido antes de qualquer número ser aceito como evidência.

Isso prova que amostras não silenciosas chegaram ao destino, com o contexto em
`running`. Não prova o alto-falante, e não é apresentado como se provasse.

**Humano.** O autor confirmou ter ouvido a narração.

## Resultado

Preparação, a partir do cache (segunda abertura, sem novo download):

```
worker/download: 6 files, 426490000 bytes declared
worker/download: vector_estimator ready … tts ready
worker/backend: webgpu available, wasm as fallback
worker/duration_predictor: session created on webgpu
worker/text_encoder:       session created on webgpu
worker/vector_estimator:   session created on webgpu
worker/vocoder:            session created on webgpu
```

Reprodução, onze frases consecutivas a partir do início do documento:

| | |
| --- | --- |
| Latência da primeira frase | **503–660 ms** entre pedir e começar a tocar |
| Frases seguintes | 0–3 ms (a fila de duas frases adiantadas já as tinha) |
| Pico de RMS | **0,096 a 0,142** em todas as frases |
| Taxa de amostragem | 48.000 Hz |
| Estado do contexto | `running` |
| Progresso | 0% → 43% no documento |
| Confirmação auditiva | sim |

Durações variadas (1,39 s a 11,08 s) confirmam que são frases diferentes e não
a mesma repetida.

## O que isso corrigiu

`onnxruntime-web/webgpu` resolve para `ort.webgpu.bundle.min.mjs`, cujo glue
carrega o binário **asyncify**; o `?url` apontava para `…jsep.wasm`, que pertence
à entrada padrão. O runtime recebia um binário que seu glue não sabe instanciar,
e o fallback reusava o mesmo arquivo. O motivo era descartado num `catch` vazio,
que é por que duas sessões de auditoria olharam para `reading...` sem aprender
nada.

## Um defeito encontrado durante esta medição

Com Listen ligado e o documento no fim, o botão "Start over" repetia a última
frase e deixava a posição em 100%. O rótulo prometia uma coisa e o narrador
fazia outra. Corrigido: no fim, o transporte volta ao início nos dois modos.

## O que continua em aberto

Um aparelho iOS real, e a primeira instalação offline medida num telefone. O
projeto `phone` da suíte E2E roda WebKit pelo Playwright, que não é o Safari de
um iPhone e não é apresentado como se fosse. Nenhum documento pessoal foi usado.
