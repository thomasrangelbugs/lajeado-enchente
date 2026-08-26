(() => {
  const LAT = -29.4669;
  const LON = -51.9614;
  const TZ = "America/Sao_Paulo";
  const FLOOD_M = 19;
  const PEAK_M = 33.66;
  const GEO = "4311403";
  const ANA_LAJEADO = "86879300";
  const ANA_MUCUM = "86510000";

  const UPSTREAM = [
    { slug: "santatereza", alt: ["santa-tereza"], flood: 15 },
    { slug: "mucum", alt: [], flood: 18 },
    { slug: "encantado", alt: [], flood: 12 },
    { slug: "rocasales", alt: ["roca-sales"], flood: 18 },
    { slug: "bomretirodosul", alt: ["bom-retiro-do-sul"], flood: 19 },
    { slug: "taquari", alt: [], flood: 8.5 }
  ];

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
    lastRiver: { m: null, at: 0, trend: 0 }
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
        lab.textContent = "BUSCANDO  " + Math.round(pct) + "%";
      }
    },
    online() {
      this.done = this.total;
      const fillEl = $("link-fill");
      const lab = $("link-label");
      const w = $("link-status");
      if (fillEl) fillEl.style.width = "100%";
      if (w) w.dataset.state = "on";
      if (lab) lab.textContent = "ONLINE";
      setTimeout(() => w && w.classList.add("idle"), 800);
    },
    offline() {
      const w = $("link-status");
      const lab = $("link-label");
      if (w) w.dataset.state = "off";
      if (lab) lab.textContent = "OFFLINE";
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

  function proxyPairs(direct, proxied) {
    return [direct, proxied].filter(Boolean);
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
    const urls = [
      ...proxyPairs(
        "https://worldtimeapi.org/api/timezone/America/Sao_Paulo",
        "/p/wtime/api/timezone/America/Sao_Paulo"
      ),
      ...proxyPairs(
        "https://worldtimeapi.org/api/ip",
        "/p/wtime/api/ip"
      ),
      ...proxyPairs(
        "https://timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo",
        "/p/timeapi/api/Time/current/zone?timeZone=America/Sao_Paulo"
      ),
      ...proxyPairs(
        "https://www.timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo",
        "/p/timeapi2/api/Time/current/zone?timeZone=America/Sao_Paulo"
      ),
      ...proxyPairs(
        "https://timeapi.io/api/Time/current/coordinate?latitude=-29.4669&longitude=-51.9614",
        "/p/timeapi/api/Time/current/coordinate?latitude=-29.4669&longitude=-51.9614"
      ),
      ...proxyPairs(
        "https://worldclockapi.com/api/json/utc/now",
        "/p/wclock/api/json/utc/now"
      ),
      "https://worldtimeapi.org/api/timezone/Etc/UTC",
      "https://1.1.1.1/cdn-cgi/trace",
      "https://cloudflare.com/cdn-cgi/trace"
    ];

    const marks = [];
    const applyOffset = () => {
      if (marks.length) state.offsetMs = median(marks);
    };
    await Promise.race([
      new Promise((resolve) => {
        let left = urls.length;
        if (!left) resolve();
        urls.forEach(async (u) => {
          try {
            const t0 = Date.now();
            const j = await grab(u, 2500);
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
              marks.push(parsed - (t0 + t1) / 2);
              applyOffset();
              resolve();
            }
          } catch (_) {}
          if (--left <= 0) resolve();
        });
      }),
      new Promise((r) => setTimeout(r, 1800))
    ]);
    applyOffset();
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
      $("v-date").textContent = `${g("day")}.${g("month")}.${g("year")}`;
      $("v-time").textContent = `${g("hour")}:${g("minute")}:${g("second")}`;
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

  function parseRiverJson(j) {
    const last = lastEntry(j);
    if (!last || !Number.isFinite(last.v)) return null;
    return { m: last.v, at: Date.parse(last.t.replace(" ", "T")), trend: trendFromSeries(j) };
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
      lajeado: "https://nivelguaiba.com.br/lajeado.json",
      lajeadoP: "/p/ng/lajeado.json",
      ana: `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${ANA_LAJEADO}&dataInicio=${br}&dataFim=${br}`,
      anaP: `/p/ana?codEstacao=${ANA_LAJEADO}&dataInicio=${encodeURIComponent(br)}&dataFim=${encodeURIComponent(br)}`,
      anaM: `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${ANA_MUCUM}&dataInicio=${br}&dataFim=${br}`,
      inmet: `https://apiprevmet3.inmet.gov.br/previsao/${GEO}`,
      inmetP: `/p/inmet/previsao/${GEO}`,
      inmetNow: `https://apiprevmet3.inmet.gov.br/estacao/proxima/${GEO}`,
      avisos: "https://apiprevmet3.inmet.gov.br/avisos/ativos",
      avisosP: "/p/inmet/avisos/ativos",
      wttr: "https://wttr.in/Lajeado+RS?format=j1",
      wttrP: "/p/wttr/Lajeado+RS?format=j1",
      allorigins: "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://nivelguaiba.com.br/lajeado.json")
    };

    modelUrls.forEach((url, i) => {
      jobs["model" + i] = url;
    });

    UPSTREAM.forEach((u) => {
      jobs["ng_" + u.slug] = `https://nivelguaiba.com.br/${u.slug}.json`;
      jobs["ngp_" + u.slug] = `/p/ng/${u.slug}.json`;
      u.alt.forEach((a, i) => {
        jobs["nga_" + u.slug + i] = `https://nivelguaiba.com.br/${a}.json`;
      });
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

    const coreKeys = new Set(["bestSimple", "flood", "lajeadoP"]);
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

      if (bag.wttr && bag.wttr.weather) {
        const extra = bag.wttr.weather.slice(0, 7).map((d) => Number(d.precipMM));
        extra.forEach((mm, i) => {
          if (Number.isFinite(mm) && rain7[i] != null) rain7[i] = (rain7[i] + mm) / 2;
        });
        const cc = bag.wttr.current_condition && bag.wttr.current_condition[0];
        if (cc) {
          if (cc.temp_C) tempNow.push(Number(cc.temp_C));
          if (cc.humidity) humNow.push(Number(cc.humidity));
          if (cc.windspeedKmph) windNow.push(Number(cc.windspeedKmph));
          if (cc.pressure) pressNow.push(Number(cc.pressure));
        }
      }
      ingestOm(bag.wttrP && typeof bag.wttrP === "object" ? bag.wttrP : null);

      const inmet = bag.inmet || bag.inmetP;
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

      let river = parseRiverJson(bag.lajeado) || parseRiverJson(bag.lajeadoP);
      if (!river && bag.allorigins) {
        try {
          const raw = bag.allorigins;
          river = parseRiverJson(typeof raw === "string" ? JSON.parse(raw) : raw);
        } catch (_) {}
      }
      const ana = parseAnaXml(bag.ana, ms) || parseAnaXml(bag.anaP, ms);
      if (ana) {
        if (!river || ana.at >= (river.at || 0)) {
          river = { m: ana.m, at: ana.at, trend: river ? river.trend : 0 };
        }
      }
      if (river) state.lastRiver = river;

      let upstreamMax = 0;
      UPSTREAM.forEach((u) => {
        const j = bag["ng_" + u.slug] || bag["ngp_" + u.slug] || bag["nga_" + u.slug + "0"];
        const r = parseRiverJson(j);
        if (r) upstreamMax = Math.max(upstreamMax, (r.m / u.flood) * 100);
      });
      const mucumAna = parseAnaXml(bag.anaM, ms);
      if (mucumAna) upstreamMax = Math.max(upstreamMax, (mucumAna.m / 18) * 100);

      const flood = bag.flood && bag.flood.daily ? bag.flood.daily : {};
      const q = (k) => (Array.isArray(flood[k]) ? flood[k].map(Number) : []);
      const qNow = q("river_discharge")[0];
      const qMean = q("river_discharge_mean");
      const qMax = q("river_discharge_max");
      const qMin = q("river_discharge_min");

      let alertStorm = false;
      let alertGrande = false;
      const avisos = bag.avisos || bag.avisosP;
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

      data.chance = chance(data);
      state.data = data;
      state.target = data.chance;
      try { paintDash(data); } catch (err) { console.error(err); }
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

  function chance(d) {
    const level = d.riverM ?? 13;
    const trend = d.trend ?? 0;
    const projected = level + clamp(trend * 0.01 * 30, -1.2, 3.5);

    const close = (m) => {
      if (m >= FLOOD_M) {
        return 58 + 40 * clamp((m - FLOOD_M) / (PEAK_M - FLOOD_M), 0, 1);
      }
      return 38 * Math.pow(m / FLOOD_M, 2.15);
    };

    let p = close(Math.max(level, projected)) * 0.32;
    p += Math.min(26, (d.rainWeek || 0) * 0.12);
    p += (d.rainPeak || Math.max(0, ...(d.rain7 || [0]))) >= 50
      ? Math.min(12, ((Math.max(0, ...(d.rain7 || [0])) - 40) * 0.16))
      : 0;

    const qMean = Math.max(0, ...(d.qMean || [0]));
    const qMax = Math.max(0, ...(d.qMax || [0]));
    const qMin = Math.min(...(d.qMin || [0]).filter(Number.isFinite).concat([qMean]));
    const scale = (q) => clamp((q - 700) / 8300, 0, 1);
    if (qMax > 0 || qMean > 0) {
      p += (0.22 * scale(qMin) + 0.5 * scale(qMean) + 0.28 * scale(qMax)) * 42;
    }

    p += Math.min(10, (d.upstreamMax || 0) * 0.09);
    if (trend > 0.4) p += Math.min(10, trend * 1.4);
    if (trend < -0.4) p -= Math.min(7, Math.abs(trend) * 1.1);
    if (d.alertStorm) p += 6;
    if (d.alertGrande) p += 12;
    if ((d.soil || 0) > 40) p += 3;

    return clamp(p, 0.2, 99.6);
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
    $("v-river").textContent = fmt(d.riverM, 2);
    $("v-trend").textContent = fmt(d.trend, 1);
    $("v-mm-d").textContent = fmt(d.rainDay, 1);
    $("v-mm-w").textContent = fmt(d.rainWeek, 1);
    $("v-mm-m").textContent = fmt(d.rainMonth, 0);
    $("v-q").textContent = fmt(d.qNow, 0);
    $("v-soil").textContent = fmt(d.soil, 0);
    $("wx-lamp").dataset.wx = wxFromCode(d.code, d.isDay);

    const week = $("week");
    week.innerHTML = "";
    const peak = Math.max(20, ...(d.rain7 || [0]));
    (d.times || []).slice(0, 7).forEach((iso, i) => {
      const mm = Number(d.rain7[i]) || 0;
      const day = iso.slice(8, 10);
      const el = document.createElement("div");
      el.className = "day";
      el.innerHTML = `<span class="d">${day}</span><span class="mm">${fmt(mm, 1)}</span><small>mm</small><span class="bar"><i style="width:${clamp((mm / peak) * 100, 4, 100)}%"></i></span>`;
      week.appendChild(el);
    });
  }

  const canvas = $("needle-canvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const g = $("gauge");
    const s = g.getBoundingClientRect();
    const r = window.devicePixelRatio || 1;
    canvas.width = Math.floor(s.width * r);
    canvas.height = Math.floor(s.height * r);
  }

  function drawNeedle(value) {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const len = Math.min(w, h) * 0.36;
    const start = -120;
    const ang = ((start + (value / 100) * 240) - 90) * Math.PI / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.shadowColor = "rgba(255, 40, 20, 0.55)";
    ctx.shadowBlur = Math.min(w, h) * 0.03;

    ctx.beginPath();
    ctx.moveTo(-len * 0.22, -Math.max(2, w * 0.004));
    ctx.lineTo(len, 0);
    ctx.lineTo(-len * 0.22, Math.max(2, w * 0.004));
    ctx.closePath();
    const grd = ctx.createLinearGradient(-len * 0.2, 0, len, 0);
    grd.addColorStop(0, "#7a140c");
    grd.addColorStop(0.35, "#ff2a18");
    grd.addColorStop(1, "#ffd0a8");
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.restore();
  }

  function tickNeedle(ts) {
    try {
      const wobble = Math.sin(ts / 420) * 0.35 + Math.sin(ts / 1100) * 0.18;
      const liveRiver = state.lastRiver.m != null
        ? state.lastRiver.m + (state.lastRiver.trend || 0) * 0.01 * ((now() - (state.lastRiver.at || now())) / 36e5)
        : null;
      if (liveRiver != null && state.data.chance != null) {
        const d = { ...state.data, riverM: liveRiver };
        state.target = clamp(chance(d) + wobble, 0, 100);
      } else if (state.data.chance != null) {
        state.target = clamp(state.data.chance + wobble, 0, 100);
      }

      const k = 0.045;
      state.needle += (state.target - state.needle) * k;
      drawNeedle(state.needle);
      $("v-pct").textContent = fmt(state.needle, 1);
      document.title = `Enchente ${fmt(state.needle, 0)}%`;

      const g = $("gauge");
      const risk = state.needle >= 70 ? "high" : state.needle >= 40 ? "mid" : "low";
      g.dataset.risk = risk;
      const riskEl = $("v-risk");
      if (riskEl) {
        riskEl.textContent = risk === "high" ? "ENCHENTE" : risk === "mid" ? "ALERTA" : "NORMAL";
      }
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(tickNeedle);
  }

  function bindKnob(el, { angle, min, max, wrap, onChange, onClick }) {
    if (!el) return { set() {}, get: () => angle };
    let cur = angle || 0;
    const apply = (a, fromUser) => {
      if (wrap) a = ((a % 360) + 360) % 360;
      else a = clamp(a, min ?? -180, max ?? 180);
      cur = a;
      el.style.transform = `rotate(${a}deg)`;
      if (fromUser && onChange) onChange(a);
    };
    apply(cur, false);

    const handle = el.closest(".knob-col") || el;
    const hub = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    let drag = false;
    let lastAng = 0;
    let moved = 0;
    let pointerId = null;

    handle.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest && ev.target.closest(".pwr")) return;
      ev.preventDefault();
      ev.stopPropagation();
      drag = true;
      moved = 0;
      pointerId = ev.pointerId;
      const c = hub();
      lastAng = Math.atan2(ev.clientY - c.y, ev.clientX - c.x) * 180 / Math.PI;
      try { handle.setPointerCapture(ev.pointerId); } catch (_) {}
    });
    handle.addEventListener("pointermove", (ev) => {
      if (!drag || (pointerId != null && ev.pointerId !== pointerId)) return;
      const c = hub();
      const rx = ev.clientX - c.x;
      const ry = ev.clientY - c.y;
      const dist = Math.hypot(rx, ry);
      const ang = Math.atan2(ry, rx) * 180 / Math.PI;
      let delta = ang - lastAng;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAng = ang;
      moved += Math.abs(delta);
      if (dist < 8) return;
      if (Math.abs(delta) > 45) return;
      apply(cur + delta, true);
    });
    handle.addEventListener("pointerup", (ev) => {
      if (pointerId != null && ev.pointerId !== pointerId) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (moved < 12 && onClick) onClick();
      drag = false;
      pointerId = null;
    });
    handle.addEventListener("pointercancel", () => { drag = false; pointerId = null; });
    handle.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      apply(cur + (ev.deltaY > 0 ? 18 : -18), true);
    }, { passive: false });
    return { set: (a) => apply(a, false), get: () => cur };
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
      { name: "GUAÍBA", mhz: 101.3, city: "PORTO ALEGRE", url: "https://radio.saopaulo01.com.br:10827/stream" },
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

    const paintStation = () => {
      const s = stations[idx] || stations[0];
      if (!s) return;
      $("radio-freq").textContent = fmtFreq(s.mhz);
      $("radio-name").textContent = s.name;
      $("radio-city").textContent = s.city;
      $("radio-band").textContent = s.mhz > 200 ? "AM" : "FM";
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
      } catch (_) {
        on = false;
        panel.classList.remove("on");
      }
    };

    const stop = () => {
      audio.pause();
      dropHls();
      on = false;
      panel.classList.remove("on");
      pwr.setAttribute("aria-pressed", "false");
    };

    pwr.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (on) stop();
      else play();
    });
    const lcd = $("radio-lcd");
    if (lcd) {
      lcd.addEventListener("click", () => {
        if (on) stop();
        else play();
      });
    }

    const skip = (dir) => {
      idx = (idx + dir + stations.length) % stations.length;
      paintStation();
      play();
    };

    let prevTune = 0;
    let tuneAccum = 0;
    bindKnob($("knob-tune"), {
      angle: 0,
      wrap: true,
      onClick: () => skip(1),
      onChange: (a) => {
        let delta = a - prevTune;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        prevTune = a;
        tuneAccum += delta;
        if (Math.abs(tuneAccum) < 22) return;
        skip(tuneAccum > 0 ? 1 : -1);
        tuneAccum = 0;
      }
    });

    bindKnob($("knob-vol"), {
      angle: 55,
      min: -135,
      max: 135,
      wrap: false,
      onChange: (a) => {
        vol = clamp((a + 135) / 270, 0, 1);
        audio.volume = vol;
      }
    });

    paintStation();

    const radioUrls = [
      "https://de1.api.radio-browser.info/json/stations/search?geo_lat=-29.47&geo_long=-51.96&geo_distance=90000&hidebroken=true&limit=25&order=clickcount&reverse=true",
      "/p/radio/json/stations/search?geo_lat=-29.47&geo_long=-51.96&geo_distance=90000&hidebroken=true&limit=25&order=clickcount&reverse=true"
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
          paintStation();
          break;
        } catch (_) {}
      }
    })();
  }

  async function boot() {
    try {
      resizeCanvas();
    } catch (err) {
      console.error(err);
    }
    window.addEventListener("resize", () => {
      try { resizeCanvas(); } catch (err) { console.error(err); }
    });
    paintClock();
    setInterval(paintClock, 200);
    requestAnimationFrame(tickNeedle);
    try { initRadio(); } catch (err) { console.error(err); }

    syncTime().catch((err) => console.error(err));

    try {
      await loadAll();
    } catch (err) {
      console.error(err);
      link.offline();
    }
    setInterval(() => { syncTime().catch((err) => console.error(err)); }, 60 * 1000);
    setInterval(() => { loadAll({ quiet: true }).catch((err) => console.error(err)); }, 3 * 60 * 1000);
  }

  boot().catch((err) => console.error(err));
})();
