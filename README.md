# Chance de Enchente — Lajeado (RS)

Painel estático no visual de **painel de carro**. O velocímetro mostra a **chance de enchente em Lajeado nos próximos 7 dias**, com dados de clima, nível do rio Taquari, vazão (GloFAS) e estações a montante.

Feito para publicar no **Netlify** (arrastar a pasta ou `publish = "."`). Sem build, sem backend próprio, sem banco.

> **Isto não é alerta oficial.** É uma estimativa a partir de APIs abertas. Em emergência, use Defesa Civil / **199**.

---

## O que o painel mostra

| Região | Indicadores |
| --- | --- |
| Esquerda | Temperatura, máxima/mínima, umidade do ar, pressão, vento, rajada, UV, nuvens |
| Centro | Velocímetro **CHANCE DE ENCHENTE · 7 DIAS** (`%` + status) |
| Direita | Tempo agora, nível do rio, tendência (cm/h), chuva hoje/semana/mês, vazão, umidade do solo |
| Meio | Relógio de Lajeado (data `dd.mm.yyyy` + hora com segundos) |
| Rádio | FM do Vale do Taquari (estação + volume) |
| Base | Previsão de chuva dos próximos 7 dias |

Status do ponteiro:

| Faixa | Status | Cor |
| --- | --- | --- |
| &lt; 40% | NORMAL | verde |
| 40–70% | ALERTA | âmbar |
| ≥ 70% | ENCHENTE | vermelho |

---

## Como publicar no Netlify

1. Entre em [app.netlify.com/drop](https://app.netlify.com/drop) (ou **Add new site → Deploy manually**).
2. Arraste a pasta **inteira** do projeto (incluindo `img/`, `css/`, `js/`, `netlify.toml`).
3. Não precisa de *build command*. O `netlify.toml` já define `publish = "."`.
4. Depois do ar, teste no celular e no desktop: dados, ponteiro, rádio (precisa de um clique) e previsão de 7 dias.

Não abra o site via `file://`. Os proxies `/p/...` só existem no Netlify. No PC, use um servidor local (veja abaixo).

---

## Como rodar no computador

Na pasta do projeto:

```powershell
npx --yes serve -p 8765
```

Abra `http://127.0.0.1:8765`.

O clima (Open-Meteo) costuma funcionar no localhost. O **nível do rio** pode ficar `--` por CORS; no Netlify o proxy `/p/ng/` preenche. Há fallback via `allorigins.win`.

---

## Estrutura

```
Lajeado Enchente/
├── index.html          # painel, relógio, rádio, previsão
├── css/style.css       # layout tipo cluster de carro, responsivo
├── js/app.js           # APIs, chance, ponteiro, relógio, rádio
├── img/
│   ├── dash-bg.png
│   ├── gauge-face.png
│   ├── needle.png
│   ├── lcd-panel.png
│   ├── weather-icons.png
│   ├── knob.png
│   ├── radio-face.png
│   └── favicon.png
├── netlify.toml        # publish + proxies CORS + cache
├── _headers            # headers extras (Netlify)
└── README.md
```

Não há `package.json`. É HTML + CSS + JS puro.

---

## Constantes usadas

Definidas no topo de `js/app.js`:

| Constante | Valor | Significado |
| --- | --- | --- |
| Coordenadas | `-29.4669, -51.9614` | Lajeado, RS |
| Fuso | `America/Sao_Paulo` | relógio e previsões |
| Cota de inundação | **19 m** | referência local |
| Pico 2024 | **33,66 m** | escala do “já inundou” |
| Código IBGE | `4311403` | INMET / geocode |
| Estação ANA Lajeado | `86879300` | telemetria do rio |
| Estação ANA Muçum | `86510000` | montante |

Cidades a montante (nível relativo à cota de cada uma): Santa Tereza, Muçum, Encantado, Roca Sales, Bom Retiro do Sul, Taquari.

---

## Como o velocímetro calcula a chance

Função `chance()` em `js/app.js`. Resultado entre **0,2%** e **99,6%**.

1. **Nível do rio vs 19 m** — quanto mais perto (ou acima) da cota, maior o peso. Acima de 19 m sobe em direção ao pico de 33,66 m.
2. **Projeção** — usa a tendência em cm/h para estimar o nível nas próximas horas.
3. **Chuva 7 dias** — acumulado da semana + pico diário forte (≥ 50 mm).
4. **Vazão GloFAS** (Open-Meteo Flood) — média, mínimo e máximo previstos (m³/s).
5. **Montante** — se estações rio acima já estão altas, a chance sobe.
6. **Tendência** — rio subindo aumenta; descendo reduz um pouco.
7. **Avisos INMET** — tempestade / chuva no RS (+6); grande perigo / vermelho (+12).
8. **Umidade do solo** — solo já saturado (> 40%) soma um pouco.

Não substitui modelo hidrológico oficial. É um índice composto para leitura rápida no painel.

---

## Fontes de dados (APIs abertas)

O site busca **várias fontes em paralelo**. O núcleo carrega primeiro (clima, GloFAS, nível Lajeado, ANA). O resto segue em segundo plano.

### Clima e vazão — Open-Meteo

- Previsão (`api.open-meteo.com`) — temperatura, chuva, vento, UV, nuvens, solo
- Vários modelos: ECMWF, GFS, ICON, GEM, Météo-France, UKMO, BOM, CMA, JMA, KMA
- Ensemble (ECMWF, GFS, ICON, GEM)
- Arquivo (chuva do mês)
- Bacia (pontos a montante no Taquari)
- **Flood / GloFAS** — vazão do rio (m³/s) nos próximos 7 dias
- Qualidade do ar, geocoding e elevação (apoio)

### Nível do rio

- [nivelguaiba.com.br](https://nivelguaiba.com.br) — `lajeado.json` e estações a montante
- **ANA** SOAP — `DadosHidrometeorologicos` das estações `86879300` (Lajeado) e `86510000` (Muçum)

### Tempo e avisos

- INMET — previsão por município (`4311403`) e avisos ativos
- wttr.in — reforço de chuva e condições atuais

### Relógio

Sincroniza o offset com várias APIs e usa a mediana (relógio local + correção):

- WorldTimeAPI
- TimeAPI
- WorldClockAPI
- Cloudflare `cdn-cgi/trace`

Atualiza na tela a cada segundo (`America/Sao_Paulo`).

---

## Proxies do Netlify (`/p/...`)

No ar, o `netlify.toml` encaminha pedidos que o navegador não faria direto (CORS):

| Caminho no site | Destino |
| --- | --- |
| `/p/ana` | Telemetria ANA |
| `/p/ng/*` | nivelguaiba.com.br |
| `/p/inmet/*` | API INMET |
| `/p/wttr/*` | wttr.in |
| `/p/wtime/*` | WorldTimeAPI |
| `/p/timeapi/*` e `/p/timeapi2/*` | TimeAPI |
| `/p/wclock/*` | WorldClockAPI |
| `/p/radio/*` | Radio Browser |

Headers: cache curto (120 s) no HTML/JS; imagens em `/img/` com cache de 1 ano.

---

## Rádio

Estações fixas (knob **ESTAÇÃO**):

| Nome | Frequência | Stream |
| --- | --- | --- |
| Independente | 91.7 | brasilstream |
| 94 FM | 94.0 | brasilstream |
| A Hora | 102.9 | youngtech |
| Gazeta | 107.9 | Santa Cruz |
| Guaíba | 101.3 | Porto Alegre |

- Clique no knob **ESTAÇÃO**: próxima emissora + play
- Girar / scroll no **VOLUME**
- LCD ou bolinha vermelha: liga / desliga
- Extra: Radio Browser (estações perto de Lajeado); se falhar, ficam as 5 fixas
- O navegador **bloqueia autoplay**: o áudio só começa depois de um clique

---

## Layout e imagens

Visual de cluster automotivo: fundo escuro, LCDs, velocímetro circular, knobs.

- Desktop: colunas esquerda | gauge | direita, depois relógio, rádio e semana
- Mobile (≤ 620 px): empilha; rádio com LCD em cima e knobs embaixo

Fontes: [Orbitron](https://fonts.google.com/specimen/Orbitron) e [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) (Google Fonts).

---

## Limitações conhecidas

- **Não é aviso oficial** da Defesa Civil, ANA ou INMET.
- Nível do rio `--` no localhost é esperado (CORS). No Netlify deve aparecer.
- Streams de rádio dependem dos servidores das emissoras.
- O `%` do gauge pode encostar na borda em alguns tamanhos de tela.
- Favicon é PNG grande; não impede o funcionamento.
- Tradutor automático do Chrome pode colocar um ícone no meio da tela — é do navegador, não do site.

---

## Licença e créditos

Uso local / divulgação do painel. Os dados pertencem às APIs e órgãos citados (Open-Meteo, ANA, INMET, nivelguaiba, Radio Browser, emissoras). Respeite os termos de cada fonte.

Marca d’água implícita do projeto: painel informativo para Lajeado e o Vale do Taquari.
