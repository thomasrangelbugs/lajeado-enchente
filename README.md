# Rio Taquari · Lajeado

Painel web **PWA** para acompanhar o **nível do Rio Taquari em Lajeado (RS)**, clima local, chuva, vazão prevista, cidades do vale e rádio FM. Interface em **cards**, pensada para celular e desktop, com leitura acessível e barra de telefones de emergência.

Publicação recomendada no **Netlify** (arrastar a pasta ou conectar o repositório). Não há build: HTML, CSS e JavaScript puro.

> **Isto não é alerta oficial.** Os números vêm de APIs e telemetrias públicas. Em emergência, use a Defesa Civil — **199**.

---

## O que o site mostra

| Bloco | Conteúdo |
| --- | --- |
| Cabeçalho | Título, relógio de Lajeado, aviso legal, indicador de sincronização dos dados |
| Nível do rio | Valor em metros, faixa de risco, hora da medição, tendência (cm/h), régua 0–19 m e legenda das cotas |
| Previsão do nível | Nível projetado, horizonte em horas e texto explicando a origem (SGB, tendência ou montante) |
| Clima | Temperatura, máx/mín, umidade, pressão, vento, nuvens e UV |
| Chuva e vazão | Chuva hoje/semana/mês, vazão GloFAS (m³/s) e umidade do solo |
| Rádio FM | Seletor de emissoras, volume, play/pause (streams HTTPS; HLS quando necessário) |
| Gráfico | Nível nas **últimas 48 horas** (canvas) |
| Vale do Taquari | Mapa esquemático + lista com nível e risco por cidade |
| Semana | Previsão de chuva dos **próximos 7 dias** |
| Extra POA | Seção recolhível: **Lago Guaíba / Porto Alegre** (referência separada do Taquari) |
| Rodapé | Atalhos **199**, 193, 192, 190 |

### Faixas oficiais — Estrela / Lajeado (SGB / Defesa Civil)

| Nível | Significado |
| --- | --- |
| Abaixo de **15 m** | Situação normal |
| **15 m** | Atenção |
| **17 m** | Alerta |
| **19 m** | Inundação |

A barra de progresso usa **19 m** como teto da escala. O texto mostra também o equivalente em **% da cota de inundação**.

### Alarme sonoro

Botão **Alarme ligado / desligado** no card do rio. Quando o nível **sobe de faixa** (normal → atenção → alerta → inundação), o app emite um bip curto. A preferência fica salva no `localStorage`.

---

## PWA (instalar no celular)

- `manifest.json` — nome **Rio Taquari · Lajeado**, ícones 192/512 em `img/`
- `sw.js` — cache da “casca” (HTML, CSS, JS); dados ao vivo sempre pela rede
- Favicon inline em SVG no `index.html` (não depende de PNG pesado)

No Chrome/Edge: menu → **Instalar app** ou **Adicionar à tela inicial**.

---

## Publicar no Netlify

1. [app.netlify.com/drop](https://app.netlify.com/drop) ou **Add new site → Deploy manually**.
2. Envie a pasta **inteira** (`index.html`, `css/`, `js/`, `img/`, `netlify.toml`, `_headers`, `manifest.json`, `sw.js`).
3. **Build command:** vazio. **Publish directory:** `.` (já definido no `netlify.toml`).

Não abra o site por `file://`. Os atalhos `/p/...` só existem com servidor (Netlify ou dev local).

---

## Rodar no computador

### Opção A — igual ao Netlify (recomendado)

Com [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```powershell
npx netlify dev
```

Abra a URL que o CLI mostrar (em geral `http://localhost:8888`). Todos os proxies `/p/...` funcionam.

### Opção B — servidor leve com proxy do rio

Na pasta do projeto:

```powershell
node tools/dev-server.mjs
```

Abre `http://127.0.0.1:8765` com proxy de **`/p/ng/*`** (nivelguaiba) e **`/p/ana`** (telemetria ANA).

### Opção C — só arquivos estáticos

```powershell
npx --yes serve -p 8765
```

Clima e parte dos dados costumam carregar. O **nível do rio** pode ficar `--` por CORS; o site exibe uma dica para usar `netlify dev` ou publicar no Netlify. Há fallback via `allorigins.win` quando possível.

---

## Estrutura do repositório

```
lajeado-enchente/
├── index.html           # layout, cards, acessibilidade (skip link, ARIA)
├── css/style.css        # tema claro, responsivo
├── js/app.js            # APIs, previsão, gráfico, rádio, alarme
├── manifest.json
├── sw.js
├── netlify.toml         # publish + proxies CORS + cache
├── _headers
├── img/
│   ├── icon-192.png
│   └── icon-512.png     # (+ variantes .webp legadas do painel antigo)
├── tools/
│   ├── dev-server.mjs   # proxy local ng/ana
│   └── compress_img.py  # utilitário opcional de imagens
└── README.md
```

Sem `package.json` — dependência externa apenas no navegador: **hls.js** (CDN) para stream `.m3u8` da Univates.

---

## Constantes principais (`js/app.js`)

| Item | Valor | Uso |
| --- | --- | --- |
| Coordenadas | `-29.4669, -51.9614` | Lajeado, RS |
| Fuso | `America/Sao_Paulo` | Relógio e previsões |
| Cotas Taquari | 15 / 17 / 19 m | Atenção, alerta, inundação |
| IBGE | `4311403` | INMET |
| ANA Lajeado | `86879300` | Telemetria (compartilhada Estrela/Lajeado) |
| ANA Muçum | `86510000` | Montante |

Cidades no vale (mapa e montante): Santa Tereza, Muçum, Encantado, Roca Sales, Estrela, Lajeado, Bom Retiro do Sul, Taquari — cada uma com cotas locais SGB/SAH quando aplicável.

**Guaíba (POA)** — cotas orientativas ~2,0 / 2,35 / 2,55 m (atenção / alerta / cheia), escala até 2,8 m; fonte `nivelguaiba.com.br` Porto Alegre.

---

## Como a previsão do nível é calculada

Função `buildForecast()` — ordem de prioridade:

1. **Boletim SGB** (`/p/sgb/sace/taquari/ultimo_boletim.php`) — se houver previsão parseada para Lajeado/Estrela, ela vence (fonte `sgb`).
2. **Onda a montante** — Encantado, Muçum, Roca Sales e Santa Tereza com atrasos típicos (horas) alinhados ao SAH; mapeia nível relativo à cota de cada cidade para a escala de Lajeado.
3. **Tendência local** — extrapolação a partir da taxa cm/h nas próximas ~6 h quando não há boletim nem montante relevante.

O card **Previsão do nível** mostra metros, horizonte (`~N horas`) e o texto em **Por quê** (`why`).

Internamente, `levelToGauge()` ainda converte nível em 0–100 % da escala (útil para lógica e alarme); a interface principal trabalha em **metros** e **faixas oficiais**, não em velocímetro.

---

## Fontes de dados

Carregamento em **duas ondas**: núcleo (clima simples, GloFAS, nível Lajeado, ANA) e depois o restante em paralelo, com barra de progresso no cabeçalho.

| Tema | Fontes |
| --- | --- |
| Clima | Open-Meteo (vários modelos + ensemble + arquivo do mês + bacia Taquari) |
| Vazão | Open-Meteo Flood / GloFAS |
| Nível Taquari e vale | [nivelguaiba.com.br](https://nivelguaiba.com.br) (`*.json`) |
| Telemetria | ANA SOAP `DadosHidrometeorologicos` |
| Previsão hidro | SGB — último boletim Taquari |
| Tempo / avisos | INMET (previsão + avisos ativos), wttr.in |
| Relógio | WorldTimeAPI, TimeAPI, WorldClockAPI, Cloudflare trace (mediana) |
| Rádio extra | Radio Browser (raio ~90 km de Lajeado), mesclado às emissoras fixas |
| POA | `portoalegre.json` no nivelguaiba |

Emissoras fixas (exemplos): Independente 91,7 · 94 FM · Univates 95,1 (HLS) · Guaíba 101,3 · A Hora 102,9 · Gazeta 107,9.

---

## Proxies Netlify (`/p/...`)

| Caminho | Destino |
| --- | --- |
| `/p/sgb/*` | www.sgb.gov.br |
| `/p/ana` | Telemetria ANA |
| `/p/ng/*` | nivelguaiba.com.br |
| `/p/inmet/*` | API INMET |
| `/p/wttr/*` | wttr.in |
| `/p/wtime/*`, `/p/timeapi/*`, `/p/timeapi2/*`, `/p/wclock/*` | Serviços de hora |
| `/p/radio/*` | Radio Browser |

Cache curto no HTML/JS; `sw.js` com `max-age=0`; imagens em `/img/` com cache longo.

---

## Acessibilidade e UX

- Link **Ir ao conteúdo**, rótulos ARIA, badges de risco com cores e texto
- Relógio e status de sync com `aria-live`
- Tipografia: [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3)
- Layout responsivo: grids de duas colunas viram uma coluna em telas estreitas

---

## Limitações

- Não substitui Defesa Civil, ANA, INMET ou SGB.
- Nível `--` no localhost com `serve` simples é esperado; use `netlify dev` ou `node tools/dev-server.mjs`.
- Streams de rádio dependem das emissoras; autoplay exige interação do usuário.
- Previsão composta é **estimativa** para leitura rápida, não modelo hidrológico oficial.
- Guaíba (POA) pode demorar dias para refletir eventos no Vale do Taquari.

---

## Licença e créditos

Projeto informativo para Lajeado e o Vale do Taquari. Dados pertencem aos órgãos e APIs citados. Respeite os termos de cada fonte.

**Thomas Rangel Bugs** — [github.com/thomasrangelbugs/lajeado-enchente](https://github.com/thomasrangelbugs/lajeado-enchente)
