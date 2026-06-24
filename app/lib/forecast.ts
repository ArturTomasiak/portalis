type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export type PortInput = {
  id?: string;
  name?: string;
  latitude: number;
  longitude: number;
};

export type DailyPortWeather = {
  date: string;

  maxWaveHeightM: number | null;
  maxSwellWaveHeightM: number | null;
  maxOceanCurrentKnots: number | null;
  maxWavePeriodS: number | null;
  maxSeaSurfaceTemperatureC: number | null;

  windSpeed10mMaxKnots: number | null;
  windGusts10mMaxKnots: number | null;
  windDirection10mDominantDeg: number | null;

  warnings: string[];
};

export type PortWeatherResult = {
  id?: string;
  name?: string;
  latitude: number;
  longitude: number;
  daily: DailyPortWeather[];
  warnings: string[];
};

type Options = {
  forecastDays?: number;
  timezone?: string;
  revalidateSeconds?: number;
};

const MARINE_API = "https://marine-api.open-meteo.com/v1/marine";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const KMH_TO_KNOTS = 0.539957;

export async function getPortWeather(
  latitude: number,
  longitude: number,
  options: Options = {},
): Promise<PortWeatherResult> {
  const [result] = await getPortsWeather(
    [{ latitude, longitude }],
    options,
  );

  return result;
}

export async function getPortsWeather(
  ports: PortInput[],
  options: Options = {},
): Promise<PortWeatherResult[]> {
  if (ports.length === 0) return [];

  const forecastDays = Math.min(options.forecastDays ?? 16, 16);
  const timezone = options.timezone ?? "auto";

  const fetchInit: NextFetchInit =
    options.revalidateSeconds === 0
      ? { cache: "no-store" }
      : { next: { revalidate: options.revalidateSeconds ?? 60 * 30 } };

  const latitudes = ports.map((p) => p.latitude).join(",");
  const longitudes = ports.map((p) => p.longitude).join(",");

  const marineUrl = new URL(MARINE_API);
  marineUrl.searchParams.set("latitude", latitudes);
  marineUrl.searchParams.set("longitude", longitudes);
  marineUrl.searchParams.set("timezone", timezone);
  marineUrl.searchParams.set("forecast_days", String(forecastDays));
  marineUrl.searchParams.set("cell_selection", "sea");

  marineUrl.searchParams.set(
    "daily",
    [
      "wave_height_max",
      "swell_wave_height_max",
      "wave_period_max",
    ].join(","),
  );

  marineUrl.searchParams.set(
    "hourly",
    [
      "ocean_current_velocity",
      "sea_surface_temperature",
    ].join(","),
  );

  const windUrl = new URL(WEATHER_API);
  windUrl.searchParams.set("latitude", latitudes);
  windUrl.searchParams.set("longitude", longitudes);
  windUrl.searchParams.set("timezone", timezone);
  windUrl.searchParams.set("forecast_days", String(forecastDays));
  windUrl.searchParams.set("wind_speed_unit", "kn");

  windUrl.searchParams.set(
    "daily",
    [
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
  );

  const [marineRaw, windRaw] = await Promise.all([
    fetchJson<OpenMeteoResponse | OpenMeteoResponse[]>(marineUrl, fetchInit),
    fetchJson<OpenMeteoResponse | OpenMeteoResponse[]>(windUrl, fetchInit),
  ]);

  const marineResponses = asArray(marineRaw);
  const windResponses = asArray(windRaw);

  return ports.map((port, index) => {
    const marine = marineResponses[index];
    const wind = windResponses[index];

    const daily = buildDailyWeather(marine, wind);
    const warnings = daily.flatMap((day) => day.warnings);

    return {
      id: port.id,
      name: port.name,
      latitude: port.latitude,
      longitude: port.longitude,
      daily,
      warnings,
    };
  });
}

type OpenMeteoResponse = {
  error?: boolean;
  reason?: string;
  daily?: Record<string, unknown[]>;
  hourly?: Record<string, unknown[]>;
};

function buildDailyWeather(
  marine: OpenMeteoResponse,
  wind: OpenMeteoResponse,
): DailyPortWeather[] {
  const marineDaily = marine.daily ?? {};
  const windDaily = wind.daily ?? {};
  const marineHourly = marine.hourly ?? {};

  const dates = uniqueDates([
    ...stringArray(marineDaily.time),
    ...stringArray(windDaily.time),
  ]);

  return dates.map((date) => {
    const marineIndex = stringArray(marineDaily.time).indexOf(date);
    const windIndex = stringArray(windDaily.time).indexOf(date);

    const maxOceanCurrentKmh = maxHourlyForDate(
      marineHourly,
      "ocean_current_velocity",
      date,
    );

    const maxOceanCurrentKnots =
      maxOceanCurrentKmh === null
        ? null
        : round(maxOceanCurrentKmh * KMH_TO_KNOTS, 2);

    const day: DailyPortWeather = {
      date,

      maxWaveHeightM: numberAt(marineDaily.wave_height_max, marineIndex),
      maxSwellWaveHeightM: numberAt(
        marineDaily.swell_wave_height_max,
        marineIndex,
      ),
      maxOceanCurrentKnots,
      maxWavePeriodS: numberAt(marineDaily.wave_period_max, marineIndex),
      maxSeaSurfaceTemperatureC: maxHourlyForDate(
        marineHourly,
        "sea_surface_temperature",
        date,
      ),

      windSpeed10mMaxKnots: numberAt(windDaily.wind_speed_10m_max, windIndex),
      windGusts10mMaxKnots: numberAt(windDaily.wind_gusts_10m_max, windIndex),
      windDirection10mDominantDeg: numberAt(
        windDaily.wind_direction_10m_dominant,
        windIndex,
      ),

      warnings: [],
    };

    day.warnings = buildMaritimeOperationWarnings(day);

    return day;
  });
}

function buildMaritimeOperationWarnings(day: DailyPortWeather): string[] {
  const warnings: string[] = [];

  if (gte(day.windGusts10mMaxKnots, 34)) {
    warnings.push(
      `${day.date}: Gale-force wind gusts possible, ${day.windGusts10mMaxKnots} kn. Maritime lifting, mooring and vessel movements may be affected.`,
    );
  } else if (gte(day.windGusts10mMaxKnots, 25)) {
    warnings.push(
      `${day.date}: Strong wind gusts possible, ${day.windGusts10mMaxKnots} kn. Check crane, loading and mooring limits.`,
    );
  }

  if (gte(day.windSpeed10mMaxKnots, 22)) {
    warnings.push(
      `${day.date}: Strong sustained wind possible, ${day.windSpeed10mMaxKnots} kn.`,
    );
  }

  if (gte(day.maxWaveHeightM, 2.5)) {
    warnings.push(
      `${day.date}: High wave height possible, ${day.maxWaveHeightM} m. Vessel approach and cargo operations may be affected.`,
    );
  }

  if (gte(day.maxSwellWaveHeightM, 2.0)) {
    warnings.push(
      `${day.date}: High swell possible, ${day.maxSwellWaveHeightM} m.`,
    );
  }

  if (gte(day.maxWavePeriodS, 10)) {
    warnings.push(
      `${day.date}: Long wave period possible, ${day.maxWavePeriodS} s. Surge and vessel motion alongside may increase.`,
    );
  }

  if (gte(day.maxOceanCurrentKnots, 2)) {
    warnings.push(
      `${day.date}: Strong ocean current possible, ${day.maxOceanCurrentKnots} kn.`,
    );
  }

  if (day.maxSeaSurfaceTemperatureC !== null && day.maxSeaSurfaceTemperatureC <= 1) {
    warnings.push(
      `${day.date}: Very cold sea-surface temperature, ${day.maxSeaSurfaceTemperatureC} °C. Check icing and cold-water procedures.`,
    );
  }

  return warnings;
}

async function fetchJson<T>(url: URL, init: NextFetchInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.reason ?? `Open-Meteo request failed: ${response.status}`);
  }

  return data as T;
}

function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function uniqueDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

function numberAt(value: unknown, index: number): number | null {
  if (!Array.isArray(value) || index < 0) return null;

  const item = value[index];

  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

function maxHourlyForDate(
  hourly: Record<string, unknown[]>,
  variable: string,
  date: string,
): number | null {
  const times = stringArray(hourly.time);
  const values = hourly[variable];

  if (!Array.isArray(values)) return null;

  const numbers = times
    .map((time, index) => {
      if (!time.startsWith(date)) return null;

      const value = values[index];

      return typeof value === "number" && Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);

  return numbers.length ? round(Math.max(...numbers), 2) : null;
}

function gte(value: number | null, threshold: number): boolean {
  return value !== null && value >= threshold;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}