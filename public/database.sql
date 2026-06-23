CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unlocode TEXT,
    country TEXT NOT NULL DEFAULT 'Poland',

    latitude REAL,
    longitude REAL,

    has_freezing_risk INTEGER DEFAULT 0,
    freezing_notes TEXT,

    website TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS terminals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    port_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    operator_name TEXT,
    terminal_type TEXT,

    latitude REAL,
    longitude REAL,

    notes TEXT,

    FOREIGN KEY (port_id) REFERENCES ports(id)
);

CREATE TABLE IF NOT EXISTS berths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    terminal_id INTEGER NOT NULL,

    name TEXT NOT NULL,

    latitude REAL,
    longitude REAL,

    length_m REAL,
    depth_m REAL,

    max_loa_m REAL,   # max dlugosc statku
    max_beam_m REAL,  # max szerokosc statku
    max_draft_m REAL, # max zanurzenie statku 
    max_dwt_t REAL,   # max nośność statku 

    quay_load_t_per_m2 REAL, # dopuszczalne obciazenie nabrzeza

    has_ro_ro INTEGER DEFAULT 0,
    has_rail_access INTEGER DEFAULT 0,
    has_road_access INTEGER DEFAULT 1,

    notes TEXT,

    FOREIGN KEY (terminal_id) REFERENCES terminals(id)
);

CREATE TABLE IF NOT EXISTS storage_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    terminal_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    storage_type TEXT NOT NULL,

    area_m2 REAL,
    covered INTEGER DEFAULT 0,

    max_load_t_per_m2 REAL,
    max_item_length_m REAL,
    max_item_width_m REAL,
    max_item_height_m REAL,
    max_item_weight_t REAL,

    has_reefer_power INTEGER DEFAULT 0,
    hazardous_allowed INTEGER DEFAULT 0,
    oversized_allowed INTEGER DEFAULT 0,

    latitude REAL,
    longitude REAL,

    notes TEXT,

    FOREIGN KEY (terminal_id) REFERENCES terminals(id)
);

CREATE TABLE IF NOT EXISTS crane (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    terminal_id INTEGER,
    berth_id INTEGER,

    name TEXT NOT NULL,
    type TEXT NOT NULL,

    max_lift_t REAL,
    outreach_m REAL,
    hook_height_m REAL,

    mobile INTEGER DEFAULT 0,
    operational INTEGER DEFAULT 1,

    notes TEXT,

    FOREIGN KEY (terminal_id) REFERENCES terminals(id),
    FOREIGN KEY (berth_id) REFERENCES berths(id)
);

CREATE TABLE IF NOT EXISTS crane_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    crane_id INTEGER NOT NULL,

    available_from TEXT NOT NULL,
    available_to TEXT NOT NULL,

    status TEXT NOT NULL,

    notes TEXT,

    FOREIGN KEY (crane_id) REFERENCES crane(id)
);

CREATE TABLE IF NOT EXISTS vessels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    imo TEXT UNIQUE,
    mmsi TEXT,

    vessel_type TEXT,

    loa_m REAL,
    beam_m REAL,
    draft_m REAL,
    summer_draft_m REAL,
    dwt_t REAL,
    gt REAL,  # gross tonnage
    nt REAL,  # net   tonnage

    deck_area_m2 REAL,
    deck_strength_t_per_m2 REAL,

    crane_capacity_t REAL,
    dynamic_positioning_class TEXT,

    notes TEXT
);

CREATE TABLE IF NOT EXISTS vessel_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    vessel_id INTEGER NOT NULL,

    available_from TEXT NOT NULL,
    available_to TEXT NOT NULL,

    location_port_id INTEGER,

    status TEXT NOT NULL,

    day_rate_eur REAL,
    notes TEXT,

    FOREIGN KEY (vessel_id) REFERENCES vessels(id),
    FOREIGN KEY (location_port_id) REFERENCES ports(id)
);

CREATE TABLE IF NOT EXISTS approach_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    port_id INTEGER NOT NULL,

    name TEXT NOT NULL,

    depth_m REAL,
    width_m REAL,

    max_loa_m REAL,
    max_beam_m REAL,
    max_draft_m REAL,
    max_air_draft_m REAL,

    pilot_required INTEGER DEFAULT 1,
    tug_required INTEGER DEFAULT 0,

    notes TEXT,

    FOREIGN KEY (port_id) REFERENCES ports(id)
);

CREATE TABLE IF NOT EXISTS port_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    port_id INTEGER NOT NULL,

    condition_type TEXT NOT NULL,

    start_month INTEGER,
    end_month INTEGER,

    severity TEXT,

    description TEXT,

    FOREIGN KEY (port_id) REFERENCES ports(id)
);

CREATE TABLE IF NOT EXISTS shipowner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    full_address TEXT,
    email TEXT,
    website TEXT
);

CREATE TABLE IF NOT EXISTS port_shipowner (
    port INTEGER,
    shipowner INTEGER,
    FOREIGN KEY (port) REFERENCES ports(id),
    FOREIGN KEY (shipowner) REFERENCES shipowner(id)
);