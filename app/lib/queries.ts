import { db, getDatabase } from "./database";
import { haversineDistanceKm, type Coordinates } from "./distance";

function database() {
  if (!db) getDatabase();

  if (!db) {
    throw new Error("Database was not initialized.");
  }

  return db;
}

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
  return database()
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

  const placeholders = vesselIds.map(() => "?").join(", ");

  return database()
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
  const connection = database();

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

  const rows = connection
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

export type PortSummary = {
  id: number;
  name: string;
  unlocode: string | null;
};

export type Port = {
  id: number;
  name: string;
  unlocode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  has_freezing_risk: number;
  freezing_notes: string | null;
  website: string | null;
  notes: string | null;
};

export type Terminal = {
  id: number;
  port_id: number;
  name: string;
  operator_name: string | null;
  terminal_type: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
};

export type Berth = {
  id: number;
  terminal_id: number;
  terminal_name: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  length_m: number | null;
  depth_m: number | null;
  max_loa_m: number | null;
  max_beam_m: number | null;
  max_draft_m: number | null;
  max_dwt_t: number | null;
  quay_load_t_per_m2: number | null;
  has_ro_ro: number;
  has_rail_access: number;
  has_road_access: number;
  notes: string | null;
};

export type StorageArea = {
  id: number;
  terminal_id: number;
  terminal_name: string;
  name: string;
  storage_type: string;
  area_m2: number | null;
  covered: number;
  max_load_t_per_m2: number | null;
  max_item_length_m: number | null;
  max_item_width_m: number | null;
  max_item_height_m: number | null;
  max_item_weight_t: number | null;
  has_reefer_power: number;
  hazardous_allowed: number;
  oversized_allowed: number;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
};

export type Crane = {
  id: number;
  terminal_id: number | null;
  terminal_name: string | null;
  berth_id: number | null;
  berth_name: string | null;
  name: string;
  type: string;
  max_lift_t: number | null;
  outreach_m: number | null;
  hook_height_m: number | null;
  mobile: number;
  operational: number;
  notes: string | null;
};

export type ApproachChannel = {
  id: number;
  port_id: number;
  name: string;
  depth_m: number | null;
  width_m: number | null;
  max_loa_m: number | null;
  max_beam_m: number | null;
  max_draft_m: number | null;
  max_air_draft_m: number | null;
  pilot_required: number;
  tug_required: number;
  notes: string | null;
};

export type PortCondition = {
  id: number;
  port_id: number;
  condition_type: string;
  start_month: number | null;
  end_month: number | null;
  severity: string | null;
  description: string | null;
};

export type Shipowner = {
  id: number;
  name: string;
  full_address: string | null;
  email: string | null;
  website: string | null;
};

export type PortReport = {
  port: Port;
  terminals: Terminal[];
  berths: Berth[];
  storageAreas: StorageArea[];
  cranes: Crane[];
  approachChannels: ApproachChannel[];
  conditions: PortCondition[];
  shipowners: Shipowner[];
};

export function getPorts(): PortSummary[] {
  return database()
    .prepare(
      `
      SELECT id, name, unlocode
      FROM ports
      ORDER BY name COLLATE NOCASE
      `,
    )
    .all() as PortSummary[];
}

export function getPortReport(portId: number): PortReport | null {
  const connection = database();

  const port = connection
    .prepare(
      `
      SELECT
        id,
        name,
        unlocode,
        country,
        latitude,
        longitude,
        has_freezing_risk,
        freezing_notes,
        website,
        notes
      FROM ports
      WHERE id = ?
      `,
    )
    .get(portId) as Port | undefined;

  if (!port) {
    return null;
  }

  const terminals = connection
    .prepare(
      `
      SELECT
        id,
        port_id,
        name,
        operator_name,
        terminal_type,
        latitude,
        longitude,
        notes
      FROM terminals
      WHERE port_id = ?
      ORDER BY name COLLATE NOCASE
      `,
    )
    .all(portId) as Terminal[];

  const berths = connection
    .prepare(
      `
      SELECT
        b.id,
        b.terminal_id,
        t.name AS terminal_name,
        b.name,
        b.latitude,
        b.longitude,
        b.length_m,
        b.depth_m,
        b.max_loa_m,
        b.max_beam_m,
        b.max_draft_m,
        b.max_dwt_t,
        b.quay_load_t_per_m2,
        b.has_ro_ro,
        b.has_rail_access,
        b.has_road_access,
        b.notes
      FROM berths b
      JOIN terminals t ON t.id = b.terminal_id
      WHERE t.port_id = ?
      ORDER BY t.name COLLATE NOCASE, b.name COLLATE NOCASE
      `,
    )
    .all(portId) as Berth[];

  const storageAreas = connection
    .prepare(
      `
      SELECT
        s.id,
        s.terminal_id,
        t.name AS terminal_name,
        s.name,
        s.storage_type,
        s.area_m2,
        s.covered,
        s.max_load_t_per_m2,
        s.max_item_length_m,
        s.max_item_width_m,
        s.max_item_height_m,
        s.max_item_weight_t,
        s.has_reefer_power,
        s.hazardous_allowed,
        s.oversized_allowed,
        s.latitude,
        s.longitude,
        s.notes
      FROM storage_areas s
      JOIN terminals t ON t.id = s.terminal_id
      WHERE t.port_id = ?
      ORDER BY t.name COLLATE NOCASE, s.name COLLATE NOCASE
      `,
    )
    .all(portId) as StorageArea[];

  const cranes = connection
    .prepare(
      `
      SELECT
        c.id,
        c.terminal_id,
        t.name AS terminal_name,
        c.berth_id,
        b.name AS berth_name,
        c.name,
        c.type,
        c.max_lift_t,
        c.outreach_m,
        c.hook_height_m,
        c.mobile,
        c.operational,
        c.notes
      FROM cranes c
      LEFT JOIN terminals t ON t.id = c.terminal_id
      LEFT JOIN berths b ON b.id = c.berth_id
      WHERE t.port_id = ?
      ORDER BY t.name COLLATE NOCASE, c.name COLLATE NOCASE
      `,
    )
    .all(portId) as Crane[];

  const approachChannels = connection
    .prepare(
      `
      SELECT
        id,
        port_id,
        name,
        depth_m,
        width_m,
        max_loa_m,
        max_beam_m,
        max_draft_m,
        max_air_draft_m,
        pilot_required,
        tug_required,
        notes
      FROM approach_channels
      WHERE port_id = ?
      ORDER BY name COLLATE NOCASE
      `,
    )
    .all(portId) as ApproachChannel[];

  const conditions = connection
    .prepare(
      `
      SELECT
        id,
        port_id,
        condition_type,
        start_month,
        end_month,
        severity,
        description
      FROM port_conditions
      WHERE port_id = ?
      ORDER BY condition_type COLLATE NOCASE, start_month
      `,
    )
    .all(portId) as PortCondition[];

  const shipowners = connection
    .prepare(
      `
      SELECT
        s.id,
        s.name,
        s.full_address,
        s.email,
        s.website
      FROM shipowners s
      JOIN port_shipowners ps ON ps.shipowner = s.id
      WHERE ps.port = ?
      ORDER BY s.name COLLATE NOCASE
      `,
    )
    .all(portId) as Shipowner[];

  return {
    port,
    terminals,
    berths,
    storageAreas,
    cranes,
    approachChannels,
    conditions,
    shipowners,
  };
}