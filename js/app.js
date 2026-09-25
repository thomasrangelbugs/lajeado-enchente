(() => {
  const LAT = -29.4669;
  const LON = -51.9614;
  const TZ = "America/Sao_Paulo";
  const COTA = {
    atencao: 15,
    alerta: 17,
    inundacao: 19
  };

  /* Cotas SGB/SAH Taquari (m). Estrela e Lajeado compartilham a regua 86879300. */
  const UPSTREAM = [
    { slug: "santatereza", alt: ["santa-tereza"], flood: 15, alerta: 9, atencao: 6 },
    { slug: "mucum", alt: [], flood: 18, alerta: 9, atencao: 6 },
    { slug: "encantado", alt: [], flood: 12, alerta: 9, atencao: 6 },
    { slug: "rocasales", alt: ["roca-sales"], flood: 18, alerta: 9, atencao: 6 },
    { slug: "bomretirodosul", alt: ["bom-retiro-do-sul"], flood: 16.5, alerta: 14, atencao: 12 },
    { slug: "taquari", alt: [], flood: 8.5, alerta: 7, atencao: 5.5 }
  ];

  const VALE = [
    { slug: "santatereza", label: "Santa Tereza", x: 6, y: 28, flood: 15, alerta: 9, atencao: 6, lagH: 10 },
    { slug: "mucum", label: "Muçum", x: 20, y: 46, flood: 18, alerta: 9, atencao: 6, lagH: 6 },
    { slug: "encantado", label: "Encantado", x: 34, y: 28, flood: 12, alerta: 9, atencao: 6, lagH: 4 },
    { slug: "rocasales", label: "Roca Sales", x: 48, y: 48, flood: 18, alerta: 9, atencao: 6, lagH: 5 },
    { slug: "estrela", label: "Estrela", x: 58, y: 24, flood: 19, alerta: 17, atencao: 15, sameAs: "lajeado", lagH: 0 },
    { slug: "lajeado", label: "Lajeado", x: 70, y: 42, flood: 19, alerta: 17, atencao: 15, home: true, lagH: 0 },
    { slug: "bomretirodosul", label: "Bom Retiro", x: 84, y: 28, flood: 16.5, alerta: 12, atencao: 9, lagH: -2 },
    { slug: "taquari", label: "Taquari", x: 96, y: 50, flood: 8.5, alerta: 6.5, atencao: 4, lagH: -4 }
  ];

  /* Cidades do seletor: Lajeado padrão + Vale + Guaíba (POA). */
  const CITIES = [
    {
      slug: "lajeado",
      label: "Lajeado",
      group: "Vale do Taquari",
      flood: 19,
      alerta: 17,
      atencao: 15,
      home: true,
      help: "Régua Estrela/Lajeado (SGB / Defesa Civil). A barra cheia corresponde à cota de inundação."
    },
    {
      slug: "estrela",
      label: "Estrela",
      group: "Vale do Taquari",
      flood: 19,
      alerta: 17,
      atencao: 15,
      sameAs: "lajeado",
      help: "Mesma régua de Lajeado (Estrela/Lajeado · SGB / Defesa Civil)."
    },
    {
      slug: "santatereza",
      label: "Santa Tereza",
      group: "Vale do Taquari",
      flood: 15,
      alerta: 9,
      atencao: 6,
      help: "Cotas locais da estação Santa Tereza (montante do Taquari)."
    },
    {
      slug: "mucum",
      label: "Muçum",
      group: "Vale do Taquari",
      flood: 18,
      alerta: 9,
      atencao: 6,
      help: "Cotas locais da estação Muçum (montante do Taquari)."
    },
    {
      slug: "encantado",
      label: "Encantado",
      group: "Vale do Taquari",
      flood: 12,
      alerta: 9,
      atencao: 6,
      help: "Cotas locais da estação Encantado (montante do Taquari)."
    },
    {
      slug: "rocasales",
      label: "Roca Sales",
      group: "Vale do Taquari",
      flood: 18,
      alerta: 9,
      atencao: 6,
      help: "Cotas locais da estação Roca Sales (montante do Taquari)."
    },
    {
      slug: "bomretirodosul",
      label: "Bom Retiro do Sul",
      group: "Vale do Taquari",
      flood: 16.5,
      alerta: 12,
      atencao: 9,
      help: "Cotas locais da estação Bom Retiro do Sul."
    },
    {
      slug: "taquari",
      label: "Taquari",
      group: "Vale do Taquari",
      flood: 8.5,
      alerta: 6.5,
      atencao: 4,
      help: "Cotas locais da estação Taquari (jusante)."
    },
    {
      slug: "portoalegre",
      label: "Porto Alegre",
      group: "Lago Guaíba",
      flood: 2.55,
      alerta: 2.35,
      atencao: 2,
      barMax: 2.8,
      basin: "guaiba",
      help: "Escala orientativa do Guaíba (Cais / ilhas · Defesa Civil POA / SGB). Não é a mesma régua do Taquari."
    }
  ];

  function getCity(slug) {
    return CITIES.find((c) => c.slug === slug) || CITIES[0];
  }

  function cityCotas(city) {
    const c = city || getCity(state.activeCity);
    return {
      atencao: c.atencao,
      alerta: c.alerta,
      inundacao: c.flood,
      barMax: c.barMax != null ? c.barMax : c.flood
    };
  }

  function fmtMeters(n) {
    if (n == null || !Number.isFinite(n)) return "--";
    const d = Math.abs(n - Math.round(n)) < 0.05 ? 0 : (n < 10 ? 2 : 1);
    return fmt(n, d);
  }

  /* Lag tipico ate Lajeado (h), alinhado ao SAH/SGB. */
  const WAVE_DRIVERS = [
    { slug: "encantado", lagH: 4, weight: 1.25 },
    { slug: "mucum", lagH: 6, weight: 1.1 },
    { slug: "rocasales", lagH: 5, weight: 0.7 },
    { slug: "santatereza", lagH: 10, weight: 0.55 }
  ];

  const GEO = "4311403";
  const ANA_LAJEADO = "86879300";
  const ANA_MUCUM = "86510000";

  const MODELS = [
    "ecmwf_ifs025",
    "ecmwf_aifs025",
    "gfs_seamless",
    "gfs_global",
    "gfs_graphcast025",
    "icon_seamless",
    "icon_global",
    "gem_seamless",
    "gem_global",
    "meteofrance_seamless",
    "meteofrance_arpege_world",
    "ukmo_seamless",
    "ukmo_global_deterministic_10km",
    "bom_access_global",
    "cma_grapes_global",
    "jma_gsm",
    "jma_seamless",
    "kma_gdps"
  ];

  const OM = "https://api.open-meteo.com/v1/forecast";
  const currentVars = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "surface_pressure",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "is_day",
    "soil_moisture_0_to_7cm",
    "soil_temperature_0cm"
  ].join(",");
  const dailyVars = [
    "precipitation_sum",
    "rain_sum",
    "precipitation_hours",
    "precipitation_probability_max",
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "uv_index_max",
    "et0_fao_evapotranspiration",
    "shortwave_radiation_sum",
    "sunshine_duration"
  ].join(",");
  const hourlyVars = "precipitation,rain,weather_code,temperature_2m,soil_moisture_0_to_7cm,cloud_cover";

  const state = {
    offsetMs: 0,
    needle: 0,
    target: 0,
    data: {},
    lastRiver: { m: null, at: 0, trend: 0 },
    riverPts: [],
    vale: {},
    valeMeta: {},
    forecast: null,
    poa: null,
    activeCity: "lajeado",
    alarmOn: true,
    alarmBand: null
  };

  const $ = (id) => document.getElementById(id);

  const link = {
    total: 1,
    done: 0,
    begin(n) {
      this.total = Math.max(1, n);
      this.done = 0;
      const w = $("link-status");
      if (w) {
        w.dataset.state = "load";
        w.classList.remove("idle");
      }
      this.paint();
    },
    tick() {
      this.done += 1;
      this.paint();
    },
    paint() {
      const pct = clamp((this.done / this.total) * 100, 3, 99);
      const fillEl = $("link-fill");
      const lab = $("link-label");
      const w = $("link-status");
      if (fillEl) fillEl.style.width = pct + "%";
      if (lab && w && w.dataset.state === "load") {
        lab.textContent = "Carregando… " + Math.round(pct) + "%";
      }
    },
    online() {
      this.done = this.total;
      const fillEl = $("link-fill");
      const lab = $("link-label");
      const w = $("link-status");
      if (fillEl) fillEl.style.width = "100%";
      if (w) w.dataset.state = "on";
      if (lab) lab.textContent = "Dados atualizados";
      setTimeout(() => w && w.classList.add("idle"), 800);
    },
    offline() {
      const w = $("link-status");
      const lab = $("link-label");
      if (w) w.dataset.state = "off";
      if (lab) lab.textContent = "Sem conexão com os dados";
    }
  };

  function pad(n, s = 2) {
    return String(n).padStart(s, "0");
  }

  function fmt(n, d = 1) {
    if (n == null || Number.isNaN(n)) return "--";
    return Number(n).toLocaleString("pt-BR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function median(arr) {
    const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
    if (!a.length) return 0;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function avg(arr) {
    const a = arr.filter((x) => Number.isFinite(x));
    if (!a.length) return null;
    return a.reduce((s, x) => s + x, 0) / a.length;
  }

  function lastEntry(obj) {
    if (!obj || typeof obj !== "object") return null;
    const keys = Object.keys(obj);
    if (!keys.length) return null;
    keys.sort();
    const k = keys[keys.length - 1];
    return { t: k, v: Number(obj[k]) };
  }

  function trendFromSeries(obj) {
    const keys = Object.keys(obj || {}).sort();
    if (keys.length < 4) return 0;
    const a = keys[keys.length - 5] || keys[0];
    const b = keys[keys.length - 1];
    const dt = (Date.parse(b.replace(" ", "T")) - Date.parse(a.replace(" ", "T"))) / 36e5;
    if (!dt) return 0;
    return ((Number(obj[b]) - Number(obj[a])) * 100) / dt;
  }

  async function grab(url, timeout = 9000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      const trimmed = text.trim().replace(/^\uFEFF/, "");
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try { return JSON.parse(trimmed); } catch (_) {}
      }
      return text;
    } finally {
      clearTimeout(t);
    }
  }

  function todayBR(ms) {
    const p = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).formatToParts(new Date(ms));
    const g = (t) => p.find((x) => x.type === t).value;
    return `${g("day")}/${g("month")}/${g("year")}`;
  }

  function addDays(iso, n) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function omUrl(extra) {
    const q = new URLSearchParams({
      latitude: String(LAT),
      longitude: String(LON),
      timezone: TZ,
      forecast_days: "7",
      ...extra
    });
    return `${OM}?${q}`;
  }

  function chunk(arr, n) {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }

  function collectDailyByDate(json, prefix) {
    const daily = json && json.daily;
    const map = {};
    if (!daily || !Array.isArray(daily.time)) return map;
    const keys = Object.keys(daily).filter((k) => k === prefix || k.startsWith(prefix + "_"));
    for (const k of keys) {
      if (k === "time" || !Array.isArray(daily[k])) continue;
      daily.time.forEach((t, i) => {
        const v = Number(daily[k][i]);
        if (!Number.isFinite(v)) return;
        if (!map[t]) map[t] = [];
        map[t].push(v);
      });
    }
    return map;
  }

  function mergeDateMaps(maps) {
    const all = {};
    maps.forEach((m) => {
      Object.entries(m || {}).forEach(([t, vals]) => {
        if (!all[t]) all[t] = [];
        all[t].push(...vals);
      });
    });
    const out = {};
    Object.keys(all).forEach((t) => {
      out[t] = avg(all[t]);
    });
    return out;
  }

  async function syncTime() {
    const candidates = [
      "/p/timeapi/api/Time/current/zone?timeZone=America/Sao_Paulo",
      "https://timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo",
      "/p/wtime/api/timezone/America/Sao_Paulo",
      "https://cloudflare.com/cdn-cgi/trace"
    ];

    for (const u of candidates) {
      try {
        const t0 = Date.now();
        const j = await grab(u, 2200);
        const t1 = Date.now();
        let parsed = NaN;
        if (typeof j === "string") {
          const unix = j.match(/unixtime[=:](\d+)/i);
          const ts = j.match(/\bts=([\d.]+)/);
          if (unix) parsed = Number(unix[1]) * 1000;
          else if (ts) parsed = Number(ts[1]) * 1000;
        } else if (j && typeof j === "object") {
          let stamp =
            j.datetime ||
            j.utc_datetime ||
            j.dateTime ||
            j.currentDateTime ||
            j.utcDateTime;
          if (!stamp && j.year) {
            stamp = `${j.year}-${pad(j.month)}-${pad(j.day)}T${pad(j.hour)}:${pad(j.minute)}:${pad(j.seconds)}`;
          }
          parsed = Date.parse(stamp);
          if (!Number.isFinite(parsed) && j.unixTime) parsed = Number(j.unixTime) * 1000;
        }
        if (Number.isFinite(parsed)) {
          state.offsetMs = parsed - (t0 + t1) / 2;
          return;
        }
      } catch (_) {}
    }
  }

  function now() {
    return Date.now() + state.offsetMs;
  }

  function paintClock() {
    try {
      const d = new Date(now());
      const p = new Intl.DateTimeFormat("pt-BR", {
        timeZone: TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).formatToParts(d);
      const g = (t) => p.find((x) => x.type === t)?.value || "--";
      const dateEl = $("v-date");
      const timeEl = $("v-time");
      const dateStr = `${g("day")}/${g("month")}/${g("year")}`;
      const timeStr = `${g("hour")}:${g("minute")}`;
      if (dateEl) dateEl.textContent = dateStr;
      if (timeEl) {
        timeEl.textContent = timeStr;
        timeEl.setAttribute("datetime", `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:00`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function wxFromCode(code, isDay) {
    if (code >= 95) return "storm";
    if (code >= 80 && code < 95) return "rain";
    if (code >= 61) return "rain";
    if (code >= 51) return "drizzle";
    if (code >= 45) return "cloud";
    if (code >= 2) return "cloud";
    return isDay ? "sun" : "moon";
  }

  function parseMaybeJson(raw) {
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    const text = String(raw).trim().replace(/^\uFEFF/, "");
    if (!text.startsWith("{") && !text.startsWith("[")) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  function parseRiverJson(j) {
    const data = parseMaybeJson(j) ?? j;
    const last = lastEntry(data);
    if (!last || !Number.isFinite(last.v)) return null;
    return {
      m: last.v,
      at: Date.parse(last.t.replace(" ", "T")),
      trend: trendFromSeries(data)
    };
  }

  function pickRiverFromBag(bag, ms) {
    const jsonSources = [bag.lajeadoP, bag.allorigins, bag.lajeadoNg];
    for (const src of jsonSources) {
      const j = parseMaybeJson(src);
      const river = parseRiverJson(j ?? src);
      if (river) return river;
    }
    const ana = parseAnaXml(bag.anaP, ms);
    if (ana) {
      return { m: ana.m, at: ana.at, trend: 0 };
    }
    return null;
  }

  async function loadRiverQuick() {
    const ms = now();
    const br = todayBR(ms);
    const tries = [
      "/p/ng/lajeado.json",
      `/p/ana?codEstacao=${ANA_LAJEADO}&dataInicio=${encodeURIComponent(br)}&dataFim=${encodeURIComponent(br)}`
    ];
    for (const url of tries) {
      try {
        const raw = await grab(url, 14000);
        let river = null;
        if (url.includes("/p/ana")) {
          river = parseAnaXml(raw, ms);
          if (river) river = { m: river.m, at: river.at, trend: 0 };
        } else {
          river = parseRiverJson(raw);
        }
        if (!river) continue;
        state.lastRiver = river;
        const j = parseMaybeJson(raw);
        const pts = url.includes("/p/ana") ? seriesFromAna(raw) : seriesFromJson(j ?? raw);
        if (pts.length) state.riverPts = pts;
        setRiverHint(false);
        drawTrace(state.riverPts);
        paintActiveCity();
        return river;
      } catch (_) {}
    }
    setRiverHint(true);
    paintActiveCity();
    return null;
  }

  function setRiverHint(show) {
    const el = $("river-hint");
    if (el) el.hidden = !show;
  }

  async function loadPoaBonus() {
    try {
      const raw = await grab("/p/ng/portoalegre.json", 14000);
      const river = parseRiverJson(raw);
      state.poa = river;
      paintActiveCity();
    } catch (_) {
      state.poa = null;
      paintActiveCity();
    }
  }

  function parseAnaXml(xml, fallbackMs) {
    if (typeof xml !== "string") return null;
    const blocks = xml.match(/<DadosHidrometereologicos[\s\S]*?<\/DadosHidrometereologicos>/g) || [];
    let best = null;
    for (const b of blocks) {
      const nivel = Number((b.match(/<Nivel>([^<]+)<\/Nivel>/) || [])[1]);
      const hora = (b.match(/<DataHora>([^<]+)<\/DataHora>/) || [])[1];
      if (!Number.isFinite(nivel)) continue;
      const at = Date.parse(String(hora).trim().replace(" ", "T"));
      const rec = { m: nivel / 100, at: Number.isFinite(at) ? at : fallbackMs };
      if (!best || rec.at > best.at) best = rec;
    }
    return best;
  }

  function seriesFromJson(j, hours = 48) {
    if (!j || typeof j !== "object" || Array.isArray(j)) return [];
    const cutoff = now() - hours * 36e5;
    return Object.keys(j)
      .map((t) => ({ t: Date.parse(String(t).replace(" ", "T")), v: Number(j[t]) }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.t >= cutoff)
      .sort((a, b) => a.t - b.t);
  }

  function seriesFromAna(xml, hours = 48) {
    if (typeof xml !== "string") return [];
    const cutoff = now() - hours * 36e5;
    const blocks = xml.match(/<DadosHidrometereologicos[\s\S]*?<\/DadosHidrometereologicos>/g) || [];
    const pts = [];
    for (const b of blocks) {
      const nivel = Number((b.match(/<Nivel>([^<]+)<\/Nivel>/) || [])[1]);
      const hora = (b.match(/<DataHora>([^<]+)<\/DataHora>/) || [])[1];
      if (!Number.isFinite(nivel)) continue;
      const t = Date.parse(String(hora).trim().replace(" ", "T"));
      if (!Number.isFinite(t) || t < cutoff) continue;
      pts.push({ t, v: nivel / 100 });
    }
    pts.sort((a, b) => a.t - b.t);
    return pts;
  }

  function pickSeries(a, b) {
    if ((a || []).length >= (b || []).length) return a || [];
    return b || [];
  }

  function inmetRain(j) {
    if (!j || typeof j !== "object") return [];
    const city = j[GEO] || Object.values(j)[0];
    if (!city || typeof city !== "object") return [];
    const days = Object.keys(city).sort();
    return days.slice(0, 7).map((day) => {
      const parts = city[day] || {};
      let mm = 0;
      for (const k of Object.keys(parts)) {
        const p = parts[k] || {};
        const t = String(p.tmin ?? p.temp ?? p.manha?.temp ?? "");
        const txt = JSON.stringify(p);
        const m = txt.match(/(\d+[.,]?\d*)\s*mm/i);
        if (m) mm += Number(m[1].replace(",", "."));
        if (p.chuva) mm += Number(String(p.chuva).replace(",", ".")) || 0;
      }
      return { day, mm };
    });
  }

  async function loadAll(opts = {}) {
    const quiet = !!opts.quiet;
    const ms = now();
    const br = todayBR(ms);
    const iso = new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });
    const pastStart = addDays(iso, -30);

    const modelUrls = chunk(MODELS, 4).map((models) =>
      omUrl({
        models: models.join(","),
        daily: "precipitation_sum,precipitation_probability_max,weather_code,temperature_2m_max,temperature_2m_min",
        current: "temperature_2m,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,is_day,pressure_msl"
      })
    );

    const jobs = {
      best: omUrl({
        current: currentVars,
        daily: dailyVars,
        hourly: hourlyVars,
        past_days: "31"
      }),
      bestSimple: omUrl({
        current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,is_day",
        daily: "precipitation_sum,weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
        past_days: "31"
      }),
      flood: `https://flood-api.open-meteo.com/v1/flood?latitude=${LAT}&longitude=${LON}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max,river_discharge_min,river_discharge_p25,river_discharge_p75&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      ensEcmwf: `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${LAT}&longitude=${LON}&models=ecmwf_ifs025&daily=precipitation_sum&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      ensGfs: `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${LAT}&longitude=${LON}&models=gfs025&daily=precipitation_sum&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      ensIcon: `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${LAT}&longitude=${LON}&models=icon_global&daily=precipitation_sum&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      ensGem: `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${LAT}&longitude=${LON}&models=gem_global&daily=precipitation_sum&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      air: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=us_aqi,pm2_5,pm10,ozone&timezone=${encodeURIComponent(TZ)}`,
      archive: `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${pastStart}&end_date=${iso}&daily=precipitation_sum&timezone=${encodeURIComponent(TZ)}`,
      prev: `https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      basin: `https://api.open-meteo.com/v1/forecast?latitude=-29.17,-29.24,-29.28,-29.47&longitude=-51.87,-51.87,-51.87,-51.96&daily=precipitation_sum&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
      geo: `https://geocoding-api.open-meteo.com/v1/search?name=Lajeado&count=1&language=pt&countryCode=BR`,
      elev: `https://api.open-meteo.com/v1/elevation?latitude=${LAT}&longitude=${LON}`,
      lajeadoP: "/p/ng/lajeado.json",
      lajeadoNg: "https://nivelguaiba.com.br/lajeado.json",
      poaP: "/p/ng/portoalegre.json",
      anaP: `/p/ana?codEstacao=${ANA_LAJEADO}&dataInicio=${encodeURIComponent(br)}&dataFim=${encodeURIComponent(br)}`,
      anaMP: `/p/ana?codEstacao=${ANA_MUCUM}&dataInicio=${encodeURIComponent(br)}&dataFim=${encodeURIComponent(br)}`,
      inmetP: `/p/inmet/previsao/${GEO}`,
      avisosP: "/p/inmet/avisos/ativos",
      wttrP: "/p/wttr/Lajeado+RS?format=j1",
      sgbP: "/p/sgb/sace/taquari/ultimo_boletim.php",
      sgbAo: "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://www.sgb.gov.br/sace/taquari/ultimo_boletim.php"),
      allorigins: "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://nivelguaiba.com.br/lajeado.json")
    };

    modelUrls.forEach((url, i) => {
      jobs["model" + i] = url;
    });

    UPSTREAM.forEach((u) => {
      jobs["ngp_" + u.slug] = `/p/ng/${u.slug}.json`;
      jobs["ngao_" + u.slug] = "https://api.allorigins.win/raw?url=" + encodeURIComponent(`https://nivelguaiba.com.br/${u.slug}.json`);
    });

    const unique = new Map();
    for (const [k, url] of Object.entries(jobs)) {
      if (!unique.has(url)) unique.set(url, []);
      unique.get(url).push(k);
    }

    const bag = {};
    const fill = async (entries, timeout, onHit) => {
      await Promise.allSettled(
        entries.map(async ([url, keys]) => {
          try {
            const val = await grab(url, timeout);
            for (const k of keys) bag[k] = val;
            if (onHit) onHit(keys);
          } catch (_) {}
          if (!quiet) link.tick();
        })
      );
    };

    const allEntries = [...unique.entries()];
    if (!quiet) link.begin(allEntries.length);

    const coreKeys = new Set(["bestSimple", "flood", "lajeadoP", "anaP", "allorigins"]);
    const core = allEntries.filter(([, keys]) => keys.some((k) => coreKeys.has(k)));
    const rest = allEntries.filter(([, keys]) => !keys.some((k) => coreKeys.has(k)));

    const commitDash = () => {
      const rainMaps = [];
      const tempNow = [];
      const humNow = [];
      const windNow = [];
      const pressNow = [];
      const codeNow = [];
      const dayFlag = [];
      const tmax = [];
      const tmin = [];
      const uv = [];
      const cloud = [];
      const soil = [];
      const gust = [];

      const ingestOm = (j) => {
        if (!j || typeof j !== "object") return;
        if (j.current) {
          if (j.current.temperature_2m != null) tempNow.push(j.current.temperature_2m);
          if (j.current.relative_humidity_2m != null) humNow.push(j.current.relative_humidity_2m);
          if (j.current.wind_speed_10m != null) windNow.push(j.current.wind_speed_10m);
          if (j.current.wind_gusts_10m != null) gust.push(j.current.wind_gusts_10m);
          if (j.current.pressure_msl != null) pressNow.push(j.current.pressure_msl);
          if (j.current.surface_pressure != null) pressNow.push(j.current.surface_pressure);
          if (j.current.weather_code != null) codeNow.push(j.current.weather_code);
          if (j.current.is_day != null) dayFlag.push(j.current.is_day);
          if (j.current.cloud_cover != null) cloud.push(j.current.cloud_cover);
          if (j.current.soil_moisture_0_to_7cm != null) soil.push(j.current.soil_moisture_0_to_7cm * 100);
        }
        rainMaps.push(collectDailyByDate(j, "precipitation_sum"));
        const d = j.daily || {};
        if (Array.isArray(d.temperature_2m_max)) tmax.push(d.temperature_2m_max[Math.max(0, d.temperature_2m_max.length - 7)] ?? d.temperature_2m_max[0]);
        if (Array.isArray(d.temperature_2m_min)) tmin.push(d.temperature_2m_min[Math.max(0, d.temperature_2m_min.length - 7)] ?? d.temperature_2m_min[0]);
        if (Array.isArray(d.uv_index_max)) uv.push(d.uv_index_max[Math.max(0, d.uv_index_max.length - 7)] ?? d.uv_index_max[0]);
      };

      ingestOm(bag.best);
      ingestOm(bag.bestSimple);
      ingestOm(bag.ensEcmwf);
      ingestOm(bag.ensGfs);
      ingestOm(bag.ensIcon);
      ingestOm(bag.ensGem);
      ingestOm(bag.prev);
      modelUrls.forEach((_, i) => ingestOm(bag["model" + i]));

      if (Array.isArray(bag.basin)) bag.basin.forEach(ingestOm);
      else ingestOm(bag.basin);

      const bestDaily = (bag.best && bag.best.daily) || (bag.bestSimple && bag.bestSimple.daily);
      const rainByDate = mergeDateMaps(rainMaps);
      let times = [];
      if (bestDaily && Array.isArray(bestDaily.time)) {
        const start = bestDaily.time.findIndex((t) => t >= iso);
        const i0 = start < 0 ? Math.max(0, bestDaily.time.length - 7) : start;
        times = bestDaily.time.slice(i0, i0 + 7);
      } else {
        times = Array.from({ length: 7 }, (_, i) => addDays(iso, i));
      }
      let rain7 = times.map((t) => rainByDate[t] ?? Number(bestDaily && bestDaily.precipitation_sum && bestDaily.precipitation_sum[bestDaily.time.indexOf(t)]) ?? 0);

      if (bag.wttrP && bag.wttrP.weather) {
        const extra = bag.wttrP.weather.slice(0, 7).map((d) => Number(d.precipMM));
        extra.forEach((mm, i) => {
          if (Number.isFinite(mm) && rain7[i] != null) rain7[i] = (rain7[i] + mm) / 2;
        });
        const cc = bag.wttrP.current_condition && bag.wttrP.current_condition[0];
        if (cc) {
          if (cc.temp_C) tempNow.push(Number(cc.temp_C));
          if (cc.humidity) humNow.push(Number(cc.humidity));
          if (cc.windspeedKmph) windNow.push(Number(cc.windspeedKmph));
          if (cc.pressure) pressNow.push(Number(cc.pressure));
        }
      }

      const inmet = bag.inmetP;
      inmetRain(inmet).forEach((row, i) => {
        if (rain7[i] != null && row.mm) rain7[i] = (rain7[i] + row.mm) / 2;
      });

      let rainMonth = 0;
      if (bestDaily && Array.isArray(bestDaily.precipitation_sum) && Array.isArray(bestDaily.time)) {
        const idxToday = bestDaily.time.indexOf(iso);
        const iEnd = idxToday < 0 ? bestDaily.time.length - 7 : idxToday + 1;
        const iStart = Math.max(0, iEnd - 30);
        rainMonth = bestDaily.precipitation_sum.slice(iStart, iEnd).reduce((s, x) => s + (Number(x) || 0), 0);
      }
      if (bag.archive && bag.archive.daily && Array.isArray(bag.archive.daily.precipitation_sum)) {
        rainMonth = bag.archive.daily.precipitation_sum.reduce((s, x) => s + (Number(x) || 0), 0);
        if (bestDaily) {
          const todayIdx = bestDaily.time ? bestDaily.time.indexOf(iso) : -1;
          if (todayIdx >= 0) rainMonth += Number(bestDaily.precipitation_sum[todayIdx]) || 0;
        }
      }

      let river = pickRiverFromBag(bag, ms);
      if (river) state.lastRiver = river;
      if (river) setRiverHint(false);
      else if (!state.lastRiver.m) setRiverHint(true);

      const jsonSeries = seriesFromJson(bag.lajeadoP);
      const anaSeries = seriesFromAna(bag.anaP);
      const riverPts = pickSeries(jsonSeries, anaSeries);
      if (riverPts.length) state.riverPts = riverPts;

      const valeRiver = (slug) => {
        const j = bag["ngp_" + slug] || bag["ngao_" + slug];
        if (!j) return null;
        try {
          return parseRiverJson(typeof j === "string" ? JSON.parse(j) : j);
        } catch (_) {
          return parseRiverJson(j);
        }
      };

      const vale = { lajeado: river ? river.m : state.lastRiver.m };
      const valeMeta = {
        lajeado: river
          ? { m: river.m, trend: river.trend || 0, at: river.at }
          : { m: state.lastRiver.m, trend: state.lastRiver.trend || 0, at: state.lastRiver.at }
      };
      UPSTREAM.forEach((u) => {
        const r = valeRiver(u.slug);
        if (r) {
          vale[u.slug] = r.m;
          valeMeta[u.slug] = { m: r.m, trend: r.trend || 0, at: r.at };
        }
      });
      vale.estrela = vale.estrela ?? vale.lajeado;
      valeMeta.estrela = valeMeta.estrela || valeMeta.lajeado;
      state.vale = vale;
      state.valeMeta = valeMeta;

      let upstreamMax = 0;
      UPSTREAM.forEach((u) => {
        const r = valeRiver(u.slug);
        if (r) upstreamMax = Math.max(upstreamMax, (r.m / u.flood) * 100);
      });
      const mucumAna = parseAnaXml(bag.anaMP, ms);
      if (mucumAna) {
        const mucumFlood = UPSTREAM.find((u) => u.slug === "mucum")?.flood || 18;
        upstreamMax = Math.max(upstreamMax, (mucumAna.m / mucumFlood) * 100);
        if (vale.mucum == null) {
          vale.mucum = mucumAna.m;
          valeMeta.mucum = { m: mucumAna.m, trend: 0, at: mucumAna.at };
        }
      }

      const sgbForecast = parseSgbBoletim(bag.sgbP) || parseSgbBoletim(bag.sgbAo);

      const flood = bag.flood && bag.flood.daily ? bag.flood.daily : {};
      const q = (k) => (Array.isArray(flood[k]) ? flood[k].map(Number) : []);
      const qNow = q("river_discharge")[0];
      const qMean = q("river_discharge_mean");
      const qMax = q("river_discharge_max");
      const qMin = q("river_discharge_min");

      let alertStorm = false;
      let alertGrande = false;
      const avisos = bag.avisosP;
      try {
        const blob = JSON.stringify(avisos || "").toLowerCase();
        if (blob.includes("rio grande do sul") || blob.includes("\"rs\"") || blob.includes("lajeado")) {
          alertStorm = blob.includes("tempestade") || blob.includes("chuva");
          alertGrande = blob.includes("grande perigo") || blob.includes("vermelho");
        }
      } catch (_) {}

      const rainWeek = rain7.reduce((s, x) => s + (Number(x) || 0), 0);
      const rainPeak = Math.max(0, ...rain7.map(Number));
      const rainDay = rain7[0] || 0;

      const data = {
        temp: avg(tempNow),
        hum: avg(humNow),
        wind: avg(windNow),
        gust: avg(gust.length ? gust : windNow.map((w) => w * 1.4)),
        hpa: avg(pressNow),
        tmax: avg(tmax) ?? (bestDaily && bestDaily.temperature_2m_max ? bestDaily.temperature_2m_max.at(-7) : null),
        tmin: avg(tmin) ?? (bestDaily && bestDaily.temperature_2m_min ? bestDaily.temperature_2m_min.at(-7) : null),
        uv: avg(uv) ?? (bestDaily && bestDaily.uv_index_max ? bestDaily.uv_index_max[bestDaily.uv_index_max.length - 7] : 0),
        cloud: avg(cloud),
        soil: avg(soil),
        code: median(codeNow),
        isDay: (avg(dayFlag) ?? 1) >= 0.5,
        riverM: river ? river.m : state.lastRiver.m,
        riverAt: river ? river.at : state.lastRiver.at,
        trend: river ? river.trend : state.lastRiver.trend,
        rainDay,
        rainWeek,
        rainMonth,
        rain7,
        rainPeak,
        times,
        qNow,
        qMean,
        qMax,
        qMin,
        upstreamMax,
        vale,
        valeMeta,
        sgbForecast,
        riverPts: state.riverPts,
        alertStorm,
        alertGrande
      };

      if (bestDaily) {
        const i0 = bestDaily.time ? Math.max(0, bestDaily.time.findIndex((t) => t >= iso)) : 0;
        data.tmax = bestDaily.temperature_2m_max ? bestDaily.temperature_2m_max[i0] : data.tmax;
        data.tmin = bestDaily.temperature_2m_min ? bestDaily.temperature_2m_min[i0] : data.tmin;
        data.uv = bestDaily.uv_index_max ? bestDaily.uv_index_max[i0] : data.uv;
        data.rainDay = bestDaily.precipitation_sum ? Number(bestDaily.precipitation_sum[i0]) || data.rainDay : data.rainDay;
      }

      data.forecast = buildForecast(data);
      data.projM = data.forecast.m;
      data.chance = levelToGauge(data.projM);
      state.data = data;
      state.forecast = data.forecast;
      state.target = levelToGauge(data.riverM);
      try { paintDash(data); } catch (err) { console.error(err); }
      const poaRiver = parseRiverJson(bag.poaP);
      if (poaRiver) {
        state.poa = poaRiver;
        paintActiveCity();
      }
      return data;
    };

    await fill(core, 4500, (keys) => {
      if (keys.some((k) => k === "bestSimple" || k === "flood" || k === "best" || k === "lajeadoP")) {
        commitDash();
      }
    });
    const first = commitDash();

    fill(rest, 6000).then(() => {
      const later = commitDash();
      if (!quiet) {
        if (later && (later.temp != null || later.riverM != null)) link.online();
        else link.offline();
      }
    }).catch(() => {
      if (!quiet) {
        if (first && (first.temp != null || first.riverM != null)) link.online();
        else link.offline();
      }
    });
  }

  function parseSgbBoletim(raw) {
    if (raw == null) return null;
    const strip = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const text = strip(
      String(raw)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    if (!text || text.length < 40) return null;

    const cities = {};
    const push = (slug, m, hours) => {
      if (!slug || !Number.isFinite(m) || m <= 0) return;
      const h = Number.isFinite(hours) ? hours : 6;
      const prev = cities[slug];
      if (!prev || h <= prev.hours) cities[slug] = { m, hours: h, source: "sgb" };
    };

    const nameMap = [
      [/estrela\s+e\s+lajeado/i, ["lajeado", "estrela"]],
      [/lajeado/i, ["lajeado", "estrela"]],
      [/mucum/i, ["mucum"]],
      [/encantado/i, ["encantado"]],
      [/santa\s+tereza/i, ["santatereza"]],
      [/bom\s+retiro/i, ["bomretirodosul"]],
      [/\btaquari\b/i, ["taquari"]]
    ];

    const re = /(?:municipio(?:s)?\s+de\s+)([A-Za-z\s]+?)(?:,|\s+o\s+nivel)[^0-9]{0,80}?(\d{3,4})\s*cm[^0-9]{0,40}?(\d{1,2})\s*h/gi;
    let match;
    while ((match = re.exec(text))) {
      const place = match[1].trim();
      const cm = Number(match[2]);
      const hours = Number(match[3]);
      for (const [rx, slugs] of nameMap) {
        if (rx.test(place)) {
          slugs.forEach((s) => push(s, cm / 100, hours));
          break;
        }
      }
    }

    if (!Object.keys(cities).length) return null;
    return { cities, at: now() };
  }

  function buildForecast(d) {
    const nowM = d.riverM;
    const empty = {
      m: null,
      hours: null,
      risk: "low",
      source: "none",
      why: "--",
      cities: {}
    };
    if (nowM == null || !Number.isFinite(nowM)) return empty;

    const sgb = d.sgbForecast;
    const cityProj = { ...(sgb && sgb.cities ? sgb.cities : {}) };

    if (sgb && sgb.cities && sgb.cities.lajeado) {
      const s = sgb.cities.lajeado;
      return {
        m: s.m,
        hours: s.hours,
        risk: riskFromLevel(s.m),
        source: "sgb",
        why: `Boletim SGB · previsão para ${s.hours} horas`,
        cities: cityProj
      };
    }

    const meta = d.valeMeta || {};
    const vale = d.vale || {};
    const fromTrend = nowM + clamp((d.trend || 0) * 0.01 * 6, -1.5, 6);
    let best = {
      m: fromTrend,
      hours: 6,
      label: null,
      score: 0
    };

    WAVE_DRIVERS.forEach((drv) => {
      const city = VALE.find((c) => c.slug === drv.slug);
      const m = vale[drv.slug];
      if (!city || m == null || !Number.isFinite(m)) return;
      const trend = (meta[drv.slug] && meta[drv.slug].trend) || 0;
      const futureUp = m + clamp(trend * 0.01 * drv.lagH, -2, 8);
      const frac = clamp(futureUp / city.flood, 0, 1.8);
      const mapped = COTA.inundacao * frac;
      if (mapped > nowM + 0.15 && (frac >= 0.45 || trend > 8)) {
        const score = (mapped - nowM) * drv.weight;
        if (score > best.score) {
          best = { m: mapped, hours: drv.lagH, label: city.label, score };
        }
      }
      cityProj[drv.slug] = cityProj[drv.slug] || {
        m: futureUp,
        hours: drv.lagH,
        source: "vale"
      };
    });

    const lajeadoProj = best.score > 0 ? Math.max(fromTrend, best.m) : fromTrend;
    [
      { slug: "bomretirodosul", lagH: 2 },
      { slug: "taquari", lagH: 4 }
    ].forEach((dn) => {
      const city = VALE.find((c) => c.slug === dn.slug);
      if (!city) return;
      const m = vale[dn.slug];
      const frac = lajeadoProj / COTA.inundacao;
      const mapped = city.flood * frac;
      const cur = m != null ? m : mapped;
      cityProj[dn.slug] = cityProj[dn.slug] || {
        m: Math.max(cur, mapped),
        hours: dn.lagH,
        source: "vale"
      };
    });

    cityProj.lajeado = { m: lajeadoProj, hours: best.hours, source: "vale" };
    cityProj.estrela = cityProj.lajeado;

    const why = best.label
      ? `Influência de ${best.label} · ~${best.hours} horas`
      : `Com base na tendência atual · ~${best.hours} horas`;

    return {
      m: lajeadoProj,
      hours: best.hours,
      risk: riskFromLevel(lajeadoProj),
      source: best.label ? "vale" : "trend",
      why,
      cities: cityProj
    };
  }

  function levelToGauge(m, city) {
    const cotas = cityCotas(city);
    if (m == null || !Number.isFinite(m) || m <= 0) return 0;
    if (m < cotas.atencao) return 40 * (m / cotas.atencao);
    if (m < cotas.alerta) {
      return 40 + 30 * ((m - cotas.atencao) / Math.max(0.01, cotas.alerta - cotas.atencao));
    }
    if (m < cotas.inundacao) {
      return 70 + 30 * ((m - cotas.alerta) / Math.max(0.01, cotas.inundacao - cotas.alerta));
    }
    return 100;
  }

  function projectLevel(d) {
    const f = buildForecast(d);
    return f.m != null ? f.m : d.riverM;
  }

  function riskFromLevel(m, city) {
    if (m == null || !Number.isFinite(m)) return "none";
    const cotas = cityCotas(city);
    if (m >= cotas.inundacao) return "high";
    if (m >= cotas.alerta) return "mid";
    if (m >= cotas.atencao) return "watch";
    return "low";
  }

  function statusLabel(risk, city) {
    const cotas = cityCotas(city);
    if (risk === "high") return `Inundação — ${fmtMeters(cotas.inundacao)} m ou mais`;
    if (risk === "mid") return `Alerta — ${fmtMeters(cotas.alerta)} m ou mais`;
    if (risk === "watch") return `Atenção — ${fmtMeters(cotas.atencao)} m ou mais`;
    if (city && city.basin === "guaiba") return "Sem alerta usual";
    return "Situação normal";
  }

  function weatherLabel(code, isDay) {
    const wx = wxFromCode(code, isDay);
    const labels = {
      sun: "Sol",
      moon: "Noite clara",
      cloud: "Nublado",
      rain: "Chuva",
      storm: "Tempestade",
      drizzle: "Garoa"
    };
    return { wx, text: labels[wx] || "—" };
  }

  function trendText(trend) {
    if (trend == null || !Number.isFinite(trend)) return { text: "indisponível", dir: "flat" };
    if (Math.abs(trend) < 1.5) return { text: "estável (quase parado)", dir: "flat" };
    if (trend > 0) return { text: `subindo · +${fmt(trend, 1)} cm/h`, dir: "up" };
    return { text: `descendo · ${fmt(trend, 1)} cm/h`, dir: "down" };
  }

  function weekdayShort(iso) {
    try {
      const label = new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        timeZone: TZ
      }).format(new Date(iso + "T12:00:00"));
      return label.replace(/\.$/u, "");
    } catch (_) {
      return iso.slice(8, 10);
    }
  }

  const WEATHER_ICON = {
    sun: "☀️",
    moon: "🌙",
    cloud: "☁️",
    rain: "🌧️",
    storm: "⛈️",
    drizzle: "🌦️"
  };

  function renderCityScale(city) {
    const cotas = cityCotas(city);
    const marks = $("level-marks");
    const legend = $("cota-legend");
    const help = $("hero-help");
    const pctWrap = $("v-pct-wrap");
    if (help) help.textContent = city.help || "";
    if (pctWrap) {
      pctWrap.innerHTML = `Equivalente a <b id="v-pct">--</b>% da cota de inundação (${fmtMeters(cotas.inundacao)} m)`;
    }
    if (marks) {
      const rows = [
        { m: cotas.atencao, label: "Atenção" },
        { m: cotas.alerta, label: "Alerta" },
        { m: cotas.inundacao, label: city.basin === "guaiba" ? "Cheia relevante" : "Inundação", max: true }
      ];
      marks.innerHTML = rows
        .map((r) => {
          const at = clamp((r.m / cotas.barMax) * 100, 0, 100);
          return `<span class="level-mark${r.max ? " level-mark--max" : ""}" style="--at:${at}%"><span>${fmtMeters(r.m)} m</span><small>${r.label}</small></span>`;
        })
        .join("");
    }
    if (legend) {
      legend.innerHTML = [
        `<li data-band="low"><span class="cota-name">Abaixo de ${fmtMeters(cotas.atencao)} m</span><span class="cota-desc">${city.basin === "guaiba" ? "Sem alerta usual" : "Situação normal"}</span></li>`,
        `<li data-band="watch"><span class="cota-name">${fmtMeters(cotas.atencao)} m</span><span class="cota-desc">Atenção</span></li>`,
        `<li data-band="mid"><span class="cota-name">${fmtMeters(cotas.alerta)} m</span><span class="cota-desc">Alerta</span></li>`,
        `<li data-band="high"><span class="cota-name">${fmtMeters(cotas.inundacao)} m</span><span class="cota-desc">${city.basin === "guaiba" ? "Cheia relevante" : "Inundação"}</span></li>`
      ].join("");
    }
  }

  function readingForCity(slug) {
    const city = getCity(slug);
    const key = city.sameAs || city.slug;
    if (key === "portoalegre") {
      const p = state.poa;
      if (!p) return { m: null, at: null, trend: null, proj: null };
      return {
        m: p.m,
        at: p.at,
        trend: p.trend,
        proj: p.m != null ? { m: p.m, hours: null, why: "Medição atual do Guaíba", risk: riskFromLevel(p.m, city), source: "guaiba" } : null
      };
    }
    if (key === "lajeado") {
      const m = state.lastRiver.m != null ? state.lastRiver.m : state.data.riverM;
      const at = state.lastRiver.at || state.data.riverAt;
      const trend = state.lastRiver.trend != null ? state.lastRiver.trend : state.data.trend;
      const fc = state.forecast || state.data.forecast;
      return { m, at, trend, proj: fc };
    }
    const meta = (state.valeMeta && state.valeMeta[key]) || {};
    const m = meta.m != null ? meta.m : (state.vale && state.vale[key]);
    const projCity =
      (state.forecast && state.forecast.cities && state.forecast.cities[key]) ||
      (state.data.forecast && state.data.forecast.cities && state.data.forecast.cities[key]) ||
      null;
    let proj = null;
    if (projCity && projCity.m != null) {
      proj = {
        m: projCity.m,
        hours: projCity.hours,
        why: projCity.source === "sgb" ? `Boletim SGB · ~${projCity.hours || "?"} h` : `Estimativa local · ~${projCity.hours || "?"} h`,
        risk: riskFromLevel(projCity.m, city),
        source: projCity.source || "vale"
      };
    }
    return { m, at: meta.at, trend: meta.trend, proj };
  }

  function paintActiveCity() {
    const city = getCity(state.activeCity);
    renderCityScale(city);
    const reading = readingForCity(city.slug);
    const title = $("site-title");
    if (title) {
      title.textContent =
        city.basin === "guaiba"
          ? `Lago Guaíba em ${city.label}`
          : `Rio Taquari em ${city.label}`;
    }
    const riverEl = $("v-river");
    if (riverEl) riverEl.textContent = fmt(reading.m, 2);
    const stamp = $("v-river-at");
    if (stamp) stamp.textContent = fmtStamp(reading.at);
    const trendEl = $("v-trend");
    const tr =
      reading.m != null && Number.isFinite(reading.m)
        ? trendText(reading.trend)
        : { text: "aguardando medição", dir: "flat" };
    if (trendEl) {
      trendEl.textContent = tr.text;
      trendEl.dataset.dir = tr.dir;
    }
    updateRiverDisplay(reading.m, city);
    paintForecast(reading.proj, city);
    const hint = $("river-hint");
    if (hint) {
      const show =
        (city.slug === "lajeado" || city.sameAs === "lajeado") &&
        (reading.m == null || !Number.isFinite(reading.m));
      hint.hidden = !show;
    }
  }

  function initCitySelect() {
    const sel = $("city-select");
    if (!sel) return;
    const saved = localStorage.getItem("activeCity");
    if (saved && CITIES.some((c) => c.slug === saved)) state.activeCity = saved;
    const groups = {};
    CITIES.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    sel.innerHTML = Object.entries(groups)
      .map(([group, list]) => {
        const opts = list
          .map((c) => `<option value="${c.slug}">${c.label}</option>`)
          .join("");
        return `<optgroup label="${group}">${opts}</optgroup>`;
      })
      .join("");
    sel.value = state.activeCity;
    sel.addEventListener("change", () => {
      state.activeCity = sel.value || "lajeado";
      localStorage.setItem("activeCity", state.activeCity);
      state.alarmBand = null;
      paintActiveCity();
    });
    paintActiveCity();
  }

  function updateRiverDisplay(m, cityArg) {
    const city = cityArg || getCity(state.activeCity);
    const cotas = cityCotas(city);
    const risk = riskFromLevel(m, city);
    const status = $("v-status");
    if (status) {
      status.textContent =
        m != null && Number.isFinite(m)
          ? statusLabel(risk, city)
          : risk === "none"
            ? "Medição indisponível"
            : "Aguardando dados";
      status.dataset.risk = risk;
    }
    const fill = $("level-fill");
    const scale = $("level-scale") || document.querySelector(".level-scale");
    if (fill) {
      const pct =
        m != null && Number.isFinite(m) ? clamp((m / cotas.barMax) * 100, 0, 100) : 0;
      fill.style.width = pct + "%";
    }
    if (scale) scale.dataset.risk = risk;
    const hero = document.querySelector(".card--hero");
    if (hero) hero.dataset.risk = risk;
    document.body.dataset.risk = risk;
    const theme = {
      none: "#f1f5f9",
      low: "#ecfdf5",
      watch: "#fffbeb",
      mid: "#fff7ed",
      high: "#fef2f2"
    };
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", theme[risk] || theme.none);
    const pctEl = $("v-pct");
    if (pctEl) {
      pctEl.textContent =
        m != null && Number.isFinite(m) ? fmt(levelToGauge(m, city), 0) : "--";
    }
    syncCotaLegend(m, city);
    if (city.home || city.sameAs === "lajeado") checkAlarm(m, city);
    if (m != null && Number.isFinite(m)) {
      document.title = `${city.label} ${fmt(m, 2)} m`;
    }
  }

  function fmtStamp(ms) {
    if (!ms || !Number.isFinite(ms)) return "--:--";
    try {
      const p = new Intl.DateTimeFormat("pt-BR", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        hour12: false
      }).formatToParts(new Date(ms));
      const g = (t) => p.find((x) => x.type === t)?.value || "--";
      return `${g("day")}/${g("month")} às ${g("hour")}:${g("minute")}`;
    } catch (_) {
      return "--:--";
    }
  }

  function cityRisk(m, city) {
    if (m == null || !Number.isFinite(m) || !city || !city.flood) return "low";
    const flood = city.flood;
    const alerta = city.alerta != null ? city.alerta : flood * (COTA.alerta / COTA.inundacao);
    const atencao = city.atencao != null ? city.atencao : flood * (COTA.atencao / COTA.inundacao);
    if (m >= flood) return "high";
    if (m >= alerta) return "mid";
    if (m >= atencao) return "watch";
    return "low";
  }

  function drawTrace(pts) {
    const c = $("river-trace");
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(40, c.clientWidth || 120);
    const cssH = Math.max(48, c.clientHeight || 96);
    c.width = Math.floor(cssW * dpr);
    c.height = Math.floor(cssH * dpr);
    const tctx = c.getContext("2d");
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, cssW, cssH);
    const vals = (pts || []).map((p) => p.v).filter(Number.isFinite);
    const dataMin = vals.length ? Math.min(...vals) : 12;
    const dataMax = vals.length ? Math.max(...vals) : 14;
    const lo = Math.min(10, Math.floor(dataMin) - 1);
    const hi = Math.max(20, Math.ceil(Math.max(dataMax, 19)) + 1);
    const padL = 36;
    const yOf = (m) => {
      const t = (clamp(m, lo, hi) - lo) / Math.max(0.5, hi - lo);
      return cssH - 10 - t * (cssH - 20);
    };
    [
      [15, "rgba(217, 119, 6, 0.35)", "#b45309"],
      [17, "rgba(234, 88, 12, 0.4)", "#c2410c"],
      [19, "rgba(185, 28, 28, 0.45)", "#b91c1c"]
    ].forEach(([m, col, lab]) => {
      const y = yOf(m);
      tctx.strokeStyle = col;
      tctx.lineWidth = 1;
      tctx.setLineDash([3, 3]);
      tctx.beginPath();
      tctx.moveTo(padL + 2, y);
      tctx.lineTo(cssW - 4, y);
      tctx.stroke();
      tctx.setLineDash([]);
      tctx.fillStyle = "#fafaf9";
      tctx.fillRect(0, y - 8, padL, 16);
      tctx.fillStyle = lab;
      tctx.font = "11px system-ui, sans-serif";
      tctx.textBaseline = "middle";
      tctx.fillText(String(m), 8, y);
    });
    if (!pts || pts.length < 2) return;
    const t0 = pts[0].t;
    const span = Math.max(1, pts[pts.length - 1].t - t0);
    tctx.beginPath();
    pts.forEach((p, i) => {
      const x = padL + ((p.t - t0) / span) * (cssW - padL - 4);
      const y = yOf(p.v);
      if (i === 0) tctx.moveTo(x, y);
      else tctx.lineTo(x, y);
    });
    const lastM = pts.length ? pts[pts.length - 1].v : null;
    const lineRisk = riskFromLevel(lastM);
    const lineColors = {
      low: "#0d9488",
      watch: "#d97706",
      mid: "#ea580c",
      high: "#dc2626"
    };
    tctx.strokeStyle = lineColors[lineRisk] || lineColors.low;
    tctx.lineWidth = 2;
    tctx.lineJoin = "round";
    tctx.lineCap = "round";
    tctx.stroke();
  }

  function paintVale(levels, forecast) {
    const g = $("vale-dots");
    const list = $("vale-list");
    const src = levels || {};
    const projCities = (forecast && forecast.cities) || {};
    const rows = VALE.map((c) => {
      const m = src[c.slug] ?? (c.sameAs ? src[c.sameAs] : null);
      const risk = cityRisk(m, c);
      const proj = projCities[c.slug] || (c.sameAs ? projCities[c.sameAs] : null);
      return { ...c, m, risk, proj };
    });
    if (g) {
      g.innerHTML = rows.map((c, i) => {
        const n = i + 1;
        return [
          `<circle class="vale-dot" cx="${c.x}" cy="${c.y}" r="${c.home ? 4.4 : 4}" data-risk="${c.risk}"></circle>`,
          `<text class="vale-num" x="${c.x}" y="${c.y + 0.35}" text-anchor="middle" dominant-baseline="middle">${n}</text>`
        ].join("");
      }).join("");
    }
    if (list) {
      list.innerHTML = rows.map((c, i) => {
        const home = c.home ? " home" : "";
        const meters = c.m != null ? `${fmt(c.m, 1)} m` : "--";
        const cota = c.flood != null ? `Inunda em ${fmt(c.flood, c.flood % 1 ? 1 : 0)} m` : "";
        let prev = "";
        if (c.proj && c.proj.m != null && Number.isFinite(c.proj.m)) {
          const showPrev = c.m == null || Math.abs(c.proj.m - c.m) >= 0.15;
          if (showPrev) {
            prev = ` · Previsão ${fmt(c.proj.m, 1)} m em ~${c.proj.hours || "?"} h`;
          }
        }
        return `<li class="${home.trim()}" data-risk="${c.risk}"><i>${i + 1}</i><span>${c.label}</span><b>${meters}</b><em>${cota}${prev}</em></li>`;
      }).join("");
    }
  }

  let audioCtx = null;
  function getAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function alarmBandOf(m, city) {
    if (m == null || !Number.isFinite(m)) return 0;
    const cotas = cityCotas(city);
    if (m >= cotas.inundacao) return 2;
    if (m >= cotas.alerta) return 1;
    return 0;
  }

  function beepAlarm(band) {
    const ac = getAudio();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume().catch(() => {});
    const chirp = (freq, at, dur) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start(at);
      o.stop(at + dur + 0.02);
    };
    const t0 = ac.currentTime;
    chirp(band >= 2 ? 980 : 740, t0, 0.16);
    chirp(band >= 2 ? 1240 : 880, t0 + 0.2, 0.18);
    if (band >= 2) chirp(1480, t0 + 0.42, 0.22);
  }

  function checkAlarm(m, city) {
    if (m == null || !Number.isFinite(m)) return;
    const band = alarmBandOf(m, city);
    if (state.alarmBand == null) {
      state.alarmBand = band;
      return;
    }
    if (state.alarmOn && band > state.alarmBand) beepAlarm(band);
    state.alarmBand = band;
  }

  function initAlarm() {
    const btn = $("alarm-btn");
    const saved = localStorage.getItem("alarmOn");
    state.alarmOn = saved == null ? true : saved !== "0";
    if (btn) {
      btn.setAttribute("aria-pressed", state.alarmOn ? "true" : "false");
      btn.textContent = state.alarmOn ? "Alarme ligado" : "Alarme desligado";
      btn.addEventListener("click", () => {
        state.alarmOn = !state.alarmOn;
        localStorage.setItem("alarmOn", state.alarmOn ? "1" : "0");
        btn.setAttribute("aria-pressed", state.alarmOn ? "true" : "false");
        btn.textContent = state.alarmOn ? "Alarme ligado" : "Alarme desligado";
        const ac = getAudio();
        if (ac && ac.state === "suspended") ac.resume().catch(() => {});
      });
    }
    const unlock = () => {
      const ac = getAudio();
      if (ac && ac.state === "suspended") ac.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", unlock, { once: true });
  }

  function paintDash(d) {
    $("v-temp").textContent = fmt(d.temp, 1);
    $("v-tmax").textContent = fmt(d.tmax, 0);
    $("v-tmin").textContent = fmt(d.tmin, 0);
    $("v-hum").textContent = fmt(d.hum, 0);
    $("v-hpa").textContent = fmt(d.hpa, 0);
    $("v-wind").textContent = fmt(d.wind, 0);
    $("v-gust").textContent = fmt(d.gust, 0);
    $("v-uv").textContent = fmt(d.uv, 1);
    $("v-cloud").textContent = fmt(d.cloud, 0);
    $("v-mm-d").textContent = fmt(d.rainDay, 1);
    $("v-mm-w").textContent = fmt(d.rainWeek, 1);
    $("v-mm-m").textContent = fmt(d.rainMonth, 0);
    $("v-q").textContent = fmt(d.qNow, 0);
    $("v-soil").textContent = fmt(d.soil, 0);
    const wLabel = $("v-weather-label");
    if (wLabel) {
      const w = weatherLabel(d.code, d.isDay);
      wLabel.dataset.wx = w.wx;
      const icon = wLabel.querySelector(".weather-icon");
      const text = wLabel.querySelector(".weather-text");
      if (icon) icon.textContent = WEATHER_ICON[w.wx] || "";
      if (text) text.textContent = w.text;
    }

    const week = $("week");
    week.innerHTML = "";
    const peak = Math.max(20, ...(d.rain7 || [0]));
    (d.times || []).slice(0, 7).forEach((iso, i) => {
      const mm = Number(d.rain7[i]) || 0;
      const dayNum = iso.slice(8, 10);
      const el = document.createElement("div");
      el.className = "day" + (i === 0 ? " day--today" : "");
      if (mm >= 25) el.dataset.heavy = "1";
      el.innerHTML = `<span class="d">${weekdayShort(iso)} ${dayNum}</span><span class="mm">${fmt(mm, 1)}</span><small>mm de chuva</small><span class="bar"><i style="width:${clamp((mm / peak) * 100, 4, 100)}%"></i></span>`;
      week.appendChild(el);
    });

    drawTrace(d.riverPts || state.riverPts);
    paintVale(d.vale || state.vale, d.forecast || state.forecast);
    paintActiveCity();
  }

  function paintForecast(f, cityArg) {
    const box = $("forecast");
    if (!box) return;
    const city = cityArg || getCity(state.activeCity);
    const fc = f || {};
    box.dataset.src = fc.source || "none";
    box.dataset.risk = fc.risk || riskFromLevel(fc.m, city);
    const proj = $("v-proj");
    const eta = $("v-proj-eta");
    const why = $("v-proj-why");
    if (proj) proj.textContent = fc.m != null ? fmt(fc.m, 2) : "--";
    if (eta) {
      if (fc.hours != null) {
        eta.textContent = `Estimativa para daqui a ~${fc.hours} horas`;
      } else if (fc.m != null) {
        eta.textContent = city.basin === "guaiba" ? "Nível atual do Guaíba" : "Horário indisponível";
      } else {
        eta.textContent = "Horário indisponível";
      }
    }
    if (why) why.textContent = fc.why || "--";
  }

  function syncCotaLegend(m, city) {
    const risk = riskFromLevel(m, city);
    document.querySelectorAll("#cota-legend li").forEach((li) => {
      li.classList.toggle("on", risk !== "none" && li.dataset.band === risk);
    });
  }

  function initRadio() {
    const audio = $("radio-audio");
    const panel = $("radio");
    const pwr = $("radio-pwr");
    const fmtFreq = (mhz) => {
      if (!Number.isFinite(mhz)) return "--.-";
      return mhz.toFixed(1);
    };

    const mhzOf = (raw, name) => {
      const tryNum = (v) => {
        const n = Number(String(v ?? "").replace(",", "."));
        if (!Number.isFinite(n) || n <= 0) return null;
        if (n >= 87 && n <= 108) return Math.round(n * 10) / 10;
        if (n >= 870 && n <= 1080) return Math.round(n) / 10;
        if (n >= 87e6 && n <= 108e6) return Math.round(n / 1e5) / 10;
        return null;
      };
      const fromName = String(name || "").match(/(\d{2,3}(?:[.,]\d)?)/);
      return tryNum(raw) ?? tryNum(fromName && fromName[1]);
    };

    let stations = [
      { name: "INDEPENDENTE", mhz: 91.7, city: "LAJEADO · VALE DO TAQUARI", url: "https://8563.brasilstream.com.br/stream" },
      { name: "94 FM", mhz: 94.0, city: "LAJEADO · VALE DO TAQUARI", url: "https://8567.brasilstream.com.br/stream" },
      { name: "UNIVATES", mhz: 95.1, city: "LAJEADO · VALE DO TAQUARI", url: "https://radio-nginx.univates.br/stream.m3u8" },
      { name: "GUAIBA", mhz: 101.3, city: "PORTO ALEGRE", url: "https://radio.saopaulo01.com.br:10827/stream" },
      { name: "A HORA", mhz: 102.9, city: "LAJEADO · VALE DO TAQUARI", url: "https://cast2.youngtech.radio.br/radio/8340/radio" },
      { name: "GAZETA", mhz: 107.9, city: "SANTA CRUZ", url: "https://hts03.brascast.com:7106/stream" }
    ];
    let idx = 0;
    let on = false;
    let vol = 0.72;
    let hls = null;

    const isHlsUrl = (u) => /\.m3u8(\?|$)/i.test(u || "");

    const dropHls = () => {
      if (!hls) return;
      try { hls.destroy(); } catch (_) {}
      hls = null;
    };

    const sortTune = () => {
      const keep = stations[idx]?.url;
      stations.sort((a, b) => a.mhz - b.mhz || a.name.localeCompare(b.name));
      const i = stations.findIndex((s) => s.url === keep);
      idx = i >= 0 ? i : 0;
    };
    sortTune();

    const select = $("radio-select");
    const volInput = $("radio-vol");

    const fillSelect = () => {
      if (!select) return;
      select.innerHTML = stations
        .map(
          (s, i) =>
            `<option value="${i}">${fmtFreq(s.mhz)} MHz — ${s.name}</option>`
        )
        .join("");
      select.value = String(idx);
    };

    const paintStation = () => {
      const s = stations[idx] || stations[0];
      if (!s) return;
      const freqEl = $("radio-freq");
      if (freqEl) freqEl.textContent = `${fmtFreq(s.mhz)} MHz`;
      const nameEl = $("radio-name");
      if (nameEl) nameEl.textContent = s.name;
      const cityEl = $("radio-city");
      if (cityEl) cityEl.textContent = s.city;
      if (select) select.value = String(idx);
    };

    const play = async () => {
      const s = stations[idx];
      if (!s) return;
      audio.volume = vol;
      dropHls();
      try {
        if (isHlsUrl(s.url)) {
          if (audio.canPlayType("application/vnd.apple.mpegurl")) {
            audio.src = s.url;
          } else if (window.Hls && window.Hls.isSupported()) {
            hls = new window.Hls({ enableWorker: true });
            hls.loadSource(s.url);
            hls.attachMedia(audio);
            await new Promise((resolve, reject) => {
              const t = setTimeout(() => reject(new Error("hls-timeout")), 8000);
              hls.once(window.Hls.Events.MANIFEST_PARSED, () => {
                clearTimeout(t);
                resolve();
              });
              hls.on(window.Hls.Events.ERROR, (_, data) => {
                if (data && data.fatal) {
                  clearTimeout(t);
                  reject(new Error("hls"));
                }
              });
            });
          } else {
            throw new Error("hls");
          }
        } else if (audio.src !== s.url) {
          audio.src = s.url;
        }
        await audio.play();
        on = true;
        panel.classList.add("on");
        pwr.setAttribute("aria-pressed", "true");
        pwr.textContent = "Parar";
      } catch (_) {
        on = false;
        panel.classList.remove("on");
        pwr.textContent = "Reproduzir";
      }
    };

    const stop = () => {
      audio.pause();
      dropHls();
      on = false;
      panel.classList.remove("on");
      pwr.setAttribute("aria-pressed", "false");
      pwr.textContent = "Reproduzir";
    };

    if (pwr) {
      pwr.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (on) stop();
        else play();
      });
    }

    if (select) {
      select.addEventListener("change", () => {
        idx = clamp(Number(select.value) || 0, 0, stations.length - 1);
        paintStation();
        if (on) play();
      });
    }

    if (volInput) {
      volInput.addEventListener("input", () => {
        vol = clamp(Number(volInput.value) / 100, 0, 1);
        audio.volume = vol;
      });
      vol = clamp(Number(volInput.value) / 100, 0, 1);
      audio.volume = vol;
    }

    fillSelect();
    paintStation();

    const radioUrls = [
      "/p/radio/json/stations/search?geo_lat=-29.47&geo_long=-51.96&geo_distance=90000&hidebroken=true&limit=25&order=clickcount&reverse=true",
      "https://de1.api.radio-browser.info/json/stations/search?geo_lat=-29.47&geo_long=-51.96&geo_distance=90000&hidebroken=true&limit=25&order=clickcount&reverse=true"
    ];
    (async () => {
      for (const u of radioUrls) {
        try {
          const rows = await grab(u, 8000);
          if (!Array.isArray(rows)) continue;
          const extra = [];
          rows.forEach((row) => {
            const url = row.url_resolved || row.url || "";
            if (row.lastcheckok !== 1 || row.hls === 1 || url.slice(0, 6) !== "https:") return;
            const mhz = mhzOf(row.frequency ?? row.freq, row.name);
            if (mhz == null) return;
            extra.push({
              name: String(row.name || "RADIO").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 22),
              mhz,
              city: String(row.state || "RS").toUpperCase(),
              url
            });
          });
          const seen = new Set(stations.map((s) => s.url));
          extra.forEach((s) => {
            if (!seen.has(s.url)) {
              seen.add(s.url);
              stations.push(s);
            }
          });
          sortTune();
          fillSelect();
          paintStation();
          break;
        } catch (_) {}
      }
    })();
  }

  async function boot() {
    window.addEventListener("resize", () => {
      try { drawTrace(state.riverPts); } catch (err) { console.error(err); }
    });
    try { initAlarm(); } catch (err) { console.error(err); }
    try { initCitySelect(); } catch (err) { console.error(err); }
    try { paintVale({}); } catch (err) { console.error(err); }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    paintClock();
    setInterval(paintClock, 1000);
    try { initRadio(); } catch (err) { console.error(err); }

    syncTime().catch(() => {});

    try {
      await loadRiverQuick();
    } catch (err) {
      console.error(err);
    }

    try {
      await loadPoaBonus();
    } catch (err) {
      console.error(err);
    }

    try {
      await loadAll();
    } catch (err) {
      console.error(err);
      link.offline();
    }
    setInterval(() => { syncTime().catch(() => {}); }, 10 * 60 * 1000);
    setInterval(() => { loadAll({ quiet: true }).catch((err) => console.error(err)); }, 3 * 60 * 1000);
  }

  boot().catch((err) => console.error(err));
})();

