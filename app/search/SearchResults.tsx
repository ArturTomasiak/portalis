"use client";

import { useEffect, useState } from "react";

import type { DailyPortWeather } from "@/app/lib/forecast";
import type { PortResultWithWeather } from "./page";

type SearchResultsProps = {
  hasSubmitted: boolean;
  results: PortResultWithWeather[];
};

export default function SearchResults({
  hasSubmitted,
  results,
}: SearchResultsProps) {
  if (!hasSubmitted) {
    return null;
  }

  if (results.length === 0) {
    return (
      <p className="search-empty">
        No ports meet the selected requirements.
      </p>
    );
  }

  return (
    <div className="result-container">
      {results.map((result) => (
        <PortCard key={result.id} result={result} />
      ))}
    </div>
  );
}

function PortCard({ result }: { result: PortResultWithWeather }) {
  const days = result.weather?.daily ?? [];
  const firstDate = days[0]?.date ?? "";
  const [selectedDate, setSelectedDate] = useState(firstDate);

  useEffect(() => {
    setSelectedDate(firstDate);
  }, [firstDate, result.id]);

  const selectedDay =
    days.find((day) => day.date === selectedDate) ?? days[0] ?? null;

  return (
    <article className="port-card">
      <div className="port-card__info">
        <h2>{result.name}</h2>

        <label className="result-field">
          <span>Distance to your offshore project:</span>

          <div className="result-input">
            <input
              readOnly
              value={
                result.distanceKm === null
                  ? "TBA"
                  : String(Math.round(result.distanceKm))
              }
            />

            <span>km</span>
          </div>
        </label>

        <label className="result-field">
          <span>Estimated price:</span>

          <div className="result-input">
            <input readOnly value="TBA" />
            <span>€</span>
          </div>
        </label>
      </div>

      <div className="weather-analysis">
        <h3>Weather analysis:</h3>

        {selectedDay ? (
          <>
            <div className="weather-dates">
              {days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  className={day.date === selectedDate ? "active" : ""}
                  onClick={() => setSelectedDate(day.date)}
                >
                  {formatDate(day.date)}
                </button>
              ))}
            </div>

            <div className="weather-box">
              <WeatherMetric
                label="Max Wave Height"
                value={selectedDay.maxWaveHeightM}
                unit="m"
              />

              <WeatherMetric
                label="Max Swell Height"
                value={selectedDay.maxSwellWaveHeightM}
                unit="m"
              />

              <WeatherMetric
                label="Max Ocean Current"
                value={selectedDay.maxOceanCurrentKnots}
                unit="kn"
              />

              <WeatherMetric
                label="Max Wave Period"
                value={selectedDay.maxWavePeriodS}
                unit="s"
              />

              <WeatherMetric
                label="Sea Surface Temperature"
                value={selectedDay.maxSeaSurfaceTemperatureC}
                unit="°C"
              />

              <WeatherMetric
                label="Max Wind Speed"
                value={selectedDay.windSpeed10mMaxKnots}
                unit="kn"
              />

              <WeatherMetric
                label="Max Wind Gusts"
                value={selectedDay.windGusts10mMaxKnots}
                unit="kn"
              />

              <WeatherMetric
                label="Dominant Wind Direction"
                value={selectedDay.windDirection10mDominantDeg}
                unit="°"
              />
            </div>

            <Warning day={selectedDay} />
          </>
        ) : (
          <p className="weather-empty">Weather forecast unavailable.</p>
        )}
      </div>
    </article>
  );
}

function WeatherMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="weather-metric">
      <span>{label}</span>
      <span>{formatValue(value, unit)}</span>
    </div>
  );
}

function Warning({ day }: { day: DailyPortWeather }) {
  if (day.warnings.length === 0) {
    return (
      <div className="warning">
        <h4>Warning</h4>
        <p>No warning for the selected date.</p>
      </div>
    );
  }

  return (
    <div className="warning">
      <h4>Warning</h4>

      {day.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}

function formatDate(date: string): string {
  const [, month, day] = date.split("-");

  return day && month ? `${day}.${month}` : date;
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) {
    return "TBA";
  }

  return `${value} ${unit}`;
}