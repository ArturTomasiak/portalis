import {db, getDatabase} from "./database";
import { haversineDistanceKm, type Coordinates } from "./distance";
import Database from "better-sqlite3";

export type VesselOption = {
  id: number;
  name: string;
};

export type PortSearchFilters = {
  offshoreCoordinates: Coordinates | null;
  vesselIds: number[];
  minBerths: number | null;
  minStorageAreaM2: number | null;
  minCraneCount: number | null;
  minCraneCapacityT: number | null;
  minCraneOutreachM: number | null;
  minCraneHookHeightM: number | null;
};

export type PortSearchResult = {
  id: number;
  name: string;
  unlocode: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  matchingBerths: number;
  totalStorageAreaM2: number;
  matchingCranes: number;
  maxCraneLiftT: number | null;
  maxCraneOutreachM: number | null;
  maxCraneHookHeightM: number | null;
};

type VesselConstraintRow = {
  loaM: number | null;
  beamM: number | null;
  draftM: number | null;
};

type PortRow = {
  id: number;
  name: string;
  unlocode: string | null;
  latitude: number;
  longitude: number;
  matchingBerths: number;
  totalStorageAreaM2: number;
  matchingCranes: number;
  maxCraneLiftT: number | null;
  maxCraneOutreachM: number | null;
  maxCraneHookHeightM: number | null;
};

export function getVesselOptions(): VesselOption[] {
  if (!db)
    getDatabase();

  return db!
    .prepare(
      `
      SELECT id, name
      FROM vessels
      ORDER BY name COLLATE NOCASE
      `,
    )
    .all() as VesselOption[];
}

function getSelectedVesselConstraints(
  vesselIds: number[],
): VesselConstraintRow[] {
  if (vesselIds.length === 0) {
    return [];
  }

  if (!db)
        getDatabase();
  const placeholders = vesselIds.map(() => "?").join(", ");
  return db!
    .prepare(
      `
      SELECT
        loa_m AS loaM,
        beam_m AS beamM,
        COALESCE(summer_draft_m, draft_m) AS draftM
      FROM vessels
      WHERE id IN (${placeholders})
      `,
    )
    .all(...vesselIds) as VesselConstraintRow[];
}

function maxNullable(values: Array<number | null>): number | null {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  return numbers.length > 0 ? Math.max(...numbers) : null;
}

function uniquePositiveIntegers(values: number[]): number[] {
  return [...new Set(values)].filter(
    (value) => Number.isInteger(value) && value > 0,
  );
}

export function searchPorts(filters: PortSearchFilters): PortSearchResult[] {
  if (!db)
        getDatabase();
  const vesselIds = uniquePositiveIntegers(filters.vesselIds);
  const vesselConstraints = getSelectedVesselConstraints(vesselIds);

  const maxSelectedLoaM = maxNullable(
    vesselConstraints.map((vessel) => vessel.loaM),
  );
  const maxSelectedBeamM = maxNullable(
    vesselConstraints.map((vessel) => vessel.beamM),
  );
  const maxSelectedDraftM = maxNullable(
    vesselConstraints.map((vessel) => vessel.draftM),
  );

  const hasVesselRequirement = vesselIds.length > 0;
  const hasCraneRequirement =
    filters.minCraneCapacityT !== null ||
    filters.minCraneOutreachM !== null ||
    filters.minCraneHookHeightM !== null;

  const effectiveMinBerths =
    filters.minBerths ?? (hasVesselRequirement ? 1 : null);

  const effectiveMinCraneCount =
    filters.minCraneCount ?? (hasCraneRequirement ? 1 : null);

  const rows = db!
    .prepare(
      `
      WITH matching_berths AS (
        SELECT
          t.port_id,
          COUNT(DISTINCT b.id) AS matchingBerths
        FROM berths b
        JOIN terminals t ON t.id = b.terminal_id
        WHERE
          (@maxSelectedLoaM IS NULL OR b.max_loa_m IS NULL OR b.max_loa_m >= @maxSelectedLoaM)
          AND (@maxSelectedBeamM IS NULL OR b.max_beam_m IS NULL OR b.max_beam_m >= @maxSelectedBeamM)
          AND (@maxSelectedDraftM IS NULL OR b.max_draft_m IS NULL OR b.max_draft_m >= @maxSelectedDraftM)
        GROUP BY t.port_id
      ),
      storage_totals AS (
        SELECT
          t.port_id,
          SUM(COALESCE(sa.area_m2, 0)) AS totalStorageAreaM2
        FROM storage_areas sa
        JOIN terminals t ON t.id = sa.terminal_id
        GROUP BY t.port_id
      ),
      matching_cranes AS (
        SELECT
          t.port_id,
          COUNT(DISTINCT c.id) AS matchingCranes,
          MAX(c.max_lift_t) AS maxCraneLiftT,
          MAX(c.outreach_m) AS maxCraneOutreachM,
          MAX(c.hook_height_m) AS maxCraneHookHeightM
        FROM cranes c
        JOIN terminals t ON t.id = c.terminal_id
        WHERE
          c.operational = 1
          AND (@minCraneCapacityT IS NULL OR c.max_lift_t >= @minCraneCapacityT)
          AND (@minCraneOutreachM IS NULL OR c.outreach_m >= @minCraneOutreachM)
          AND (@minCraneHookHeightM IS NULL OR c.hook_height_m >= @minCraneHookHeightM)
        GROUP BY t.port_id
      )
      SELECT
        p.id,
        p.name,
        p.unlocode,
        p.latitude,
        p.longitude,
        COALESCE(mb.matchingBerths, 0) AS matchingBerths,
        COALESCE(st.totalStorageAreaM2, 0) AS totalStorageAreaM2,
        COALESCE(mc.matchingCranes, 0) AS matchingCranes,
        mc.maxCraneLiftT,
        mc.maxCraneOutreachM,
        mc.maxCraneHookHeightM
      FROM ports p
      LEFT JOIN matching_berths mb ON mb.port_id = p.id
      LEFT JOIN storage_totals st ON st.port_id = p.id
      LEFT JOIN matching_cranes mc ON mc.port_id = p.id
      WHERE
        p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND (@effectiveMinBerths IS NULL OR COALESCE(mb.matchingBerths, 0) >= @effectiveMinBerths)
        AND (@minStorageAreaM2 IS NULL OR COALESCE(st.totalStorageAreaM2, 0) >= @minStorageAreaM2)
        AND (@effectiveMinCraneCount IS NULL OR COALESCE(mc.matchingCranes, 0) >= @effectiveMinCraneCount)
      ORDER BY p.name COLLATE NOCASE
      `,
    )
    .all({
      maxSelectedLoaM,
      maxSelectedBeamM,
      maxSelectedDraftM,
      effectiveMinBerths,
      minStorageAreaM2: filters.minStorageAreaM2,
      effectiveMinCraneCount,
      minCraneCapacityT: filters.minCraneCapacityT,
      minCraneOutreachM: filters.minCraneOutreachM,
      minCraneHookHeightM: filters.minCraneHookHeightM,
    }) as PortRow[];

  return rows
    .map((row) => ({
      ...row,
      distanceKm: filters.offshoreCoordinates
        ? haversineDistanceKm(filters.offshoreCoordinates, {
            latitude: row.latitude,
            longitude: row.longitude,
          })
        : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return a.name.localeCompare(b.name);
      }

      if (a.distanceKm === null) {
        return 1;
      }

      if (b.distanceKm === null) {
        return -1;
      }

      return a.distanceKm - b.distanceKm;
    });
}