"use client";

import { useState } from "react";

import type { VesselOption } from "@/app/lib/queries";

export type SearchFormState = {
  latDeg: string;
  latMin: string;
  lonDeg: string;
  lonMin: string;
  minBerths: string;
  minStorageAreaM2: string;
  minCraneCount: string;
  minCraneCapacityT: string;
  minCraneOutreachM: string;
  minCraneHookHeightM: string;
  vesselIds: string[];
  months: string[];
};

type SearchFormProps = {
  vessels: VesselOption[];
  initialState: SearchFormState;
  months: string[];
};

export default function SearchForm({
  vessels,
  initialState,
  months,
}: SearchFormProps) {
  const [vesselIds, setVesselIds] = useState<string[]>(
    initialState.vesselIds.length > 0 ? initialState.vesselIds : [""],
  );

  function addVesselSelect() {
    setVesselIds((current) => [...current, ""]);
  }

  function updateVesselSelect(index: number, value: string) {
    setVesselIds((current) =>
      current.map((vesselId, currentIndex) =>
        currentIndex === index ? value : vesselId,
      ),
    );
  }

  return (
    <form className="search" action="/search" method="get">
      <input type="hidden" name="submitted" value="1" />

      <div className="column">
        <div className="field">
          <label className="titile">Enter offshore coordinates:</label>

          <div className="coordinates">
            <input
              name="latDeg"
              type="number"
              min="0"
              step="1"
              aria-label="Latitude degrees"
              defaultValue={initialState.latDeg}
            />

            <span>°</span>

            <input
              name="latMin"
              type="number"
              min="0"
              max="59.999"
              step="0.001"
              aria-label="Latitude minutes"
              defaultValue={initialState.latMin}
            />

            <span>&apos;</span>
            <span>N</span>

            <input
              name="lonDeg"
              type="number"
              min="0"
              step="1"
              aria-label="Longitude degrees"
              defaultValue={initialState.lonDeg}
            />

            <span>°</span>

            <input
              name="lonMin"
              type="number"
              min="0"
              max="59.999"
              step="0.001"
              aria-label="Longitude minutes"
              defaultValue={initialState.lonMin}
            />

            <span>&apos;</span>
            <span>E</span>
          </div>
        </div>

        <div className="field">
          <label>Minimum number of berths:</label>
          <input
            name="minBerths"
            className="small-input"
            type="number"
            min="0"
            step="1"
            defaultValue={initialState.minBerths}
          />
        </div>

        <div className="field">
          <label>Storage area:</label>

          <div className="unit-input">
            <input
              name="minStorageAreaM2"
              className="small-input"
              type="number"
              min="0"
              step="1"
              defaultValue={initialState.minStorageAreaM2}
            />

            <span>m²</span>
          </div>
        </div>

        <div className="field">
          <label>Vessels:</label>

          <div className="vessel-list">
            {vesselIds.map((vesselId, index) => (
              <div className="vessel-row" key={index}>
                <select
                  name="vesselId"
                  className="vessel-select"
                  value={vesselId}
                  onChange={(event) =>
                    updateVesselSelect(index, event.target.value)
                  }
                >
                  <option value="">Select vessel</option>

                  {vessels.map((vessel) => (
                    <option key={vessel.id} value={vessel.id}>
                      {vessel.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button className="plus-btn" type="button" onClick={addVesselSelect}>
            +
          </button>
        </div>
      </div>

      <div className="column">
        <label className="title">Crane requirements:</label>

        <div className="field">
          <label>Min quantity</label>
          <input
            name="minCraneCount"
            className="small-input"
            type="number"
            min="0"
            step="1"
            defaultValue={initialState.minCraneCount}
          />
        </div>

        <div className="field">
          <label>Min lifting capacity</label>

          <div className="user-input">
            <input
              name="minCraneCapacityT"
              className="small-input"
              type="number"
              min="0"
              step="0.1"
              defaultValue={initialState.minCraneCapacityT}
            />

            <span>T</span>
          </div>
        </div>

        <div className="field">
          <label>Min outreach</label>

          <div className="unit-input">
            <input
              name="minCraneOutreachM"
              className="small-input"
              type="number"
              min="0"
              step="0.1"
              defaultValue={initialState.minCraneOutreachM}
            />

            <span>m</span>
          </div>
        </div>

        <div className="field">
          <label>Min hook height</label>

          <div className="unit-input">
            <input
              name="minCraneHookHeightM"
              className="small-input"
              type="number"
              min="0"
              step="0.1"
              defaultValue={initialState.minCraneHookHeightM}
            />

            <span>m</span>
          </div>
        </div>
      </div>

      <div className="column">
        <label className="title">Required operational period:</label>

        <div className="months">
          {months.map((month) => (
            <label key={month}>
              <input
                type="checkbox"
                name="month"
                value={month}
                defaultChecked={initialState.months.includes(month)}
              />

              <span>{month}</span>
            </label>
          ))}
        </div>

        <button className="seach-btn" type="submit">
          Search
        </button>
      </div>
    </form>
  );
}