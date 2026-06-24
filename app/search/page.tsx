import "./search.scss";

import { getPortsWeather, type PortWeatherResult } from "@/app/lib/forecast";
import {
  getVesselOptions,
  searchPorts,
  type PortSearchFilters,
  type PortSearchResult,
} from "@/app/lib/queries";

import SearchForm, { type SearchFormState } from "./SearchForm";
import SearchResults from "./SearchResults";

const months: string[] = [
  "jan", "feb", "mar",
  "apr", "may", "jun",
  "jul", "aug", "sep",
  "oct", "nov", "dec",
];

type SearchParams = Record<string, string | string[] | undefined>;

type SearchPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

export type PortResultWithWeather = PortSearchResult & {
  weather?: PortWeatherResult;
};

export default async function Home({ searchParams }: SearchPageProps) {
  const rawSearchParams = ((await searchParams) ?? {}) as SearchParams;
  const { formState, filters, hasSubmitted } = parseSearchParams(rawSearchParams);

  const vessels = getVesselOptions();
  const ports = hasSubmitted ? searchPorts(filters) : [];
  const weatherByPortId = await getWeatherByPortId(ports);

  const results: PortResultWithWeather[] = ports.map((port) => ({
    ...port,
    weather: weatherByPortId.get(String(port.id)),
  }));

  return (
    <body>
      <header>
        <div className="logo">
          <img src="/portalis_search.webp" alt="portalis logo" />
        </div>

        <div className="companies">
          <img className="slipform" src="/slipform.webp" alt="slipform logo" />
          <img className="seaglobal" src="/seaglobal.webp" alt="sea global logo" />
        </div>
      </header>

      <main>
        <SearchForm
          vessels={vessels}
          initialState={formState}
          months={months}
        />

        <div className="results">
          <div className="title">
            <h1>List of ports meeting requirements:</h1>
            <p className="subtitle">from closest to offshore coordinates to furthest</p>
          </div>

          <SearchResults
            hasSubmitted={hasSubmitted}
            results={results}
          />
        </div>
      </main>
      <a className="go-back-button" href="/">
        Go back
        </a>
    </body>
  );
}

async function getWeatherByPortId(
  ports: PortSearchResult[],
): Promise<Map<string, PortWeatherResult>> {
  const weatherByPortId = new Map<string, PortWeatherResult>();

  if (ports.length === 0) {
    return weatherByPortId;
  }

  try {
    const forecasts = await getPortsWeather(
      ports.map((port) => ({
        id: String(port.id),
        name: port.name,
        latitude: port.latitude,
        longitude: port.longitude,
      })),
      {
        forecastDays: 7,
      },
    );

    for (const forecast of forecasts) {
      if (forecast.id) {
        weatherByPortId.set(forecast.id, forecast);
      }
    }
  } catch (error) {
    console.error("Could not load port weather:", error);
  }

  return weatherByPortId;
}

function parseSearchParams(raw: SearchParams): {
  formState: SearchFormState;
  filters: PortSearchFilters;
  hasSubmitted: boolean;
} {
  const hasSubmitted = firstValue(raw, "submitted") === "1";

  const vesselIds = valuesFor(raw, "vesselId")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  const latitude = coordinateFromDegreesAndMinutes(
    firstValue(raw, "latDeg") ?? "",
    firstValue(raw, "latMin") ?? "",
  );

  const longitude = coordinateFromDegreesAndMinutes(
    firstValue(raw, "lonDeg") ?? "",
    firstValue(raw, "lonMin") ?? "",
  );

  const selectedMonths = valuesFor(raw, "month").filter((month) =>
    months.includes(month),
  );

  const formState: SearchFormState = {
    latDeg: firstValue(raw, "latDeg") ?? "",
    latMin: firstValue(raw, "latMin") ?? "",
    lonDeg: firstValue(raw, "lonDeg") ?? "",
    lonMin: firstValue(raw, "lonMin") ?? "",
    minBerths: firstValue(raw, "minBerths") ?? "0",
    minStorageAreaM2: firstValue(raw, "minStorageAreaM2") ?? "0",
    minCraneCount: firstValue(raw, "minCraneCount") ?? "0",
    minCraneCapacityT: firstValue(raw, "minCraneCapacityT") ?? "0",
    minCraneOutreachM: firstValue(raw, "minCraneOutreachM") ?? "0",
    minCraneHookHeightM: firstValue(raw, "minCraneHookHeightM") ?? "0",
    vesselIds: valuesFor(raw, "vesselId").filter(Boolean),
    months: hasSubmitted ? selectedMonths : months,
  };

  const filters: PortSearchFilters = {
    offshoreCoordinates:
      latitude !== null && longitude !== null
        ? {
            latitude,
            longitude,
          }
        : null,
    vesselIds,
    minBerths: positiveNumber(firstValue(raw, "minBerths")),
    minStorageAreaM2: positiveNumber(firstValue(raw, "minStorageAreaM2")),
    minCraneCount: positiveNumber(firstValue(raw, "minCraneCount")),
    minCraneCapacityT: positiveNumber(firstValue(raw, "minCraneCapacityT")),
    minCraneOutreachM: positiveNumber(firstValue(raw, "minCraneOutreachM")),
    minCraneHookHeightM: positiveNumber(firstValue(raw, "minCraneHookHeightM")),
  };

  return {
    formState,
    filters,
    hasSubmitted,
  };
}

function valuesFor(raw: SearchParams, key: string): string[] {
  const value = raw[key];

  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function firstValue(raw: SearchParams, key: string): string | undefined {
  return valuesFor(raw, key)[0];
}

function positiveNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function coordinateFromDegreesAndMinutes(
  degreesValue: string,
  minutesValue: string,
): number | null {
  const degrees = nonNegativeNumber(degreesValue);

  if (degrees === null) {
    return null;
  }

  const minutes = nonNegativeNumber(minutesValue) ?? 0;

  return degrees + minutes / 60;
}