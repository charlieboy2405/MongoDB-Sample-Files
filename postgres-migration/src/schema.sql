-- ============================================================================
-- PostgreSQL Schema for MongoDB Weather Data Migration
-- ============================================================================
-- Source: MongoDB weather collection (10,000 documents)
-- This schema normalizes the nested MongoDB document structure into
-- properly related PostgreSQL tables.
-- ============================================================================

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS liquid_precipitations CASCADE;
DROP TABLE IF EXISTS extreme_air_temperatures CASCADE;
DROP TABLE IF EXISTS observation_sections CASCADE;
DROP TABLE IF EXISTS sky_cover_layers CASCADE;
DROP TABLE IF EXISTS present_weather_observations CASCADE;
DROP TABLE IF EXISTS past_weather_observations CASCADE;
DROP TABLE IF EXISTS wave_measurements CASCADE;
DROP TABLE IF EXISTS sky_condition_observations CASCADE;
DROP TABLE IF EXISTS atmospheric_pressure_observations CASCADE;
DROP TABLE IF EXISTS atmospheric_pressure_changes CASCADE;
DROP TABLE IF EXISTS weather_observations CASCADE;

-- ============================================================================
-- Main table: weather_observations
-- ============================================================================
-- Contains all core fields present in 100% of documents, plus high-frequency
-- optional scalar fields (sea_surface_temperature). Nested sub-documents that
-- are optional or represent arrays are broken into child tables.
-- ============================================================================

CREATE TABLE weather_observations (
    id                  SERIAL PRIMARY KEY,
    mongo_id            VARCHAR(24) UNIQUE NOT NULL,  -- Original MongoDB ObjectId

    -- Station & metadata
    st                  VARCHAR(50) NOT NULL,          -- Station identifier
    ts                  TIMESTAMPTZ NOT NULL,          -- Observation timestamp
    call_letters        VARCHAR(10) NOT NULL,          -- Call letters
    quality_control_process VARCHAR(10) NOT NULL,      -- e.g. 'V020'
    data_source         VARCHAR(5) NOT NULL,           -- e.g. '4'
    type                VARCHAR(10) NOT NULL,          -- e.g. 'FM-13'

    -- Position (flattened from GeoJSON Point)
    longitude           DOUBLE PRECISION,              -- position.coordinates[0]
    latitude            DOUBLE PRECISION,              -- position.coordinates[1]
    elevation           INTEGER NOT NULL,              -- Elevation in meters

    -- Air Temperature (100% present)
    air_temp_value      DOUBLE PRECISION NOT NULL,
    air_temp_quality    VARCHAR(2) NOT NULL,

    -- Dew Point (100% present)
    dew_point_value     DOUBLE PRECISION NOT NULL,
    dew_point_quality   VARCHAR(2) NOT NULL,

    -- Pressure (100% present)
    pressure_value      DOUBLE PRECISION NOT NULL,
    pressure_quality    VARCHAR(2) NOT NULL,

    -- Wind (100% present)
    wind_direction_angle    INTEGER NOT NULL,
    wind_direction_quality  VARCHAR(2) NOT NULL,
    wind_type               VARCHAR(2) NOT NULL,
    wind_speed_rate         DOUBLE PRECISION NOT NULL,
    wind_speed_quality      VARCHAR(2) NOT NULL,

    -- Visibility (100% present)
    visibility_distance_value   INTEGER NOT NULL,
    visibility_distance_quality VARCHAR(2) NOT NULL,
    visibility_variability_value    VARCHAR(5) NOT NULL,
    visibility_variability_quality  VARCHAR(2) NOT NULL,

    -- Sky Condition (100% present)
    sky_condition_ceiling_height_value       INTEGER NOT NULL,
    sky_condition_ceiling_height_quality     VARCHAR(2) NOT NULL,
    sky_condition_ceiling_height_determination VARCHAR(2) NOT NULL,
    sky_condition_cavok                      VARCHAR(2) NOT NULL,

    -- Precipitation Estimated Observation (100% present)
    precip_est_discrepancy      VARCHAR(5) NOT NULL,
    precip_est_water_depth      INTEGER NOT NULL,

    -- Sea Surface Temperature (80.2% present - nullable)
    sea_surface_temp_value      DOUBLE PRECISION,
    sea_surface_temp_quality    VARCHAR(2)
);

-- Indexes for common query patterns
CREATE INDEX idx_weather_obs_ts ON weather_observations(ts);
CREATE INDEX idx_weather_obs_st ON weather_observations(st);
CREATE INDEX idx_weather_obs_call_letters ON weather_observations(call_letters);
CREATE INDEX idx_weather_obs_position ON weather_observations(longitude, latitude);
CREATE INDEX idx_weather_obs_type ON weather_observations(type);

-- ============================================================================
-- atmospheric_pressure_changes (84.3% of documents)
-- ============================================================================

CREATE TABLE atmospheric_pressure_changes (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    tendency_code       VARCHAR(5) NOT NULL,
    tendency_quality    VARCHAR(2) NOT NULL,
    quantity_3hours_value   DOUBLE PRECISION NOT NULL,
    quantity_3hours_quality VARCHAR(2) NOT NULL,
    quantity_24hours_value  DOUBLE PRECISION NOT NULL,
    quantity_24hours_quality VARCHAR(2) NOT NULL,
    UNIQUE(observation_id)
);

CREATE INDEX idx_atm_pressure_change_obs ON atmospheric_pressure_changes(observation_id);

-- ============================================================================
-- atmospheric_pressure_observations (0.6% of documents)
-- ============================================================================

CREATE TABLE atmospheric_pressure_observations (
    id                      SERIAL PRIMARY KEY,
    observation_id          INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    altimeter_setting_value     DOUBLE PRECISION NOT NULL,
    altimeter_setting_quality   VARCHAR(2) NOT NULL,
    station_pressure_value      DOUBLE PRECISION NOT NULL,
    station_pressure_quality    VARCHAR(2) NOT NULL,
    UNIQUE(observation_id)
);

CREATE INDEX idx_atm_pressure_obs_obs ON atmospheric_pressure_observations(observation_id);

-- ============================================================================
-- sky_condition_observations (94.4% of documents)
-- ============================================================================

CREATE TABLE sky_condition_observations (
    id                          SERIAL PRIMARY KEY,
    observation_id              INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    total_coverage_value        VARCHAR(5) NOT NULL,
    total_coverage_opaque       VARCHAR(5) NOT NULL,
    total_coverage_quality      VARCHAR(2) NOT NULL,
    lowest_cloud_coverage_value     VARCHAR(5) NOT NULL,
    lowest_cloud_coverage_quality   VARCHAR(2) NOT NULL,
    low_cloud_genus_value       VARCHAR(5) NOT NULL,
    low_cloud_genus_quality     VARCHAR(2) NOT NULL,
    lowest_cloud_base_height_value  INTEGER NOT NULL,
    lowest_cloud_base_height_quality VARCHAR(2) NOT NULL,
    mid_cloud_genus_value       VARCHAR(5) NOT NULL,
    mid_cloud_genus_quality     VARCHAR(2) NOT NULL,
    high_cloud_genus_value      VARCHAR(5) NOT NULL,
    high_cloud_genus_quality    VARCHAR(2) NOT NULL,
    UNIQUE(observation_id)
);

CREATE INDEX idx_sky_cond_obs_obs ON sky_condition_observations(observation_id);

-- ============================================================================
-- wave_measurements (75.5% of documents)
-- ============================================================================

CREATE TABLE wave_measurements (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    method              VARCHAR(5) NOT NULL,
    waves_period        INTEGER NOT NULL,
    waves_height        DOUBLE PRECISION NOT NULL,
    waves_quality       VARCHAR(2) NOT NULL,
    sea_state_code      VARCHAR(5) NOT NULL,
    sea_state_quality   VARCHAR(2) NOT NULL,
    UNIQUE(observation_id)
);

CREATE INDEX idx_wave_meas_obs ON wave_measurements(observation_id);

-- ============================================================================
-- past_weather_observations (90.4% of documents, array max length 1)
-- ============================================================================

CREATE TABLE past_weather_observations (
    id                          SERIAL PRIMARY KEY,
    observation_id              INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    atmospheric_condition_value VARCHAR(5) NOT NULL,
    atmospheric_condition_quality VARCHAR(2) NOT NULL,
    period_value                INTEGER NOT NULL,
    period_quality              VARCHAR(2) NOT NULL
);

CREATE INDEX idx_past_weather_obs ON past_weather_observations(observation_id);

-- ============================================================================
-- present_weather_observations (91.1% of documents, array max length 1)
-- ============================================================================

CREATE TABLE present_weather_observations (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    condition           VARCHAR(10) NOT NULL,
    quality             VARCHAR(2) NOT NULL
);

CREATE INDEX idx_present_weather_obs ON present_weather_observations(observation_id);

-- ============================================================================
-- sky_cover_layers (7.4% of documents, array max length 3)
-- ============================================================================

CREATE TABLE sky_cover_layers (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    coverage_value      VARCHAR(5) NOT NULL,
    coverage_quality    VARCHAR(2) NOT NULL,
    base_height_value   INTEGER NOT NULL,
    base_height_quality VARCHAR(2) NOT NULL,
    cloud_type_value    VARCHAR(5) NOT NULL,
    cloud_type_quality  VARCHAR(2) NOT NULL
);

CREATE INDEX idx_sky_cover_layers_obs ON sky_cover_layers(observation_id);

-- ============================================================================
-- observation_sections (100% of documents, array of strings, max length 12)
-- ============================================================================

CREATE TABLE observation_sections (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    section_code        VARCHAR(10) NOT NULL
);

CREATE INDEX idx_obs_sections_obs ON observation_sections(observation_id);
CREATE INDEX idx_obs_sections_code ON observation_sections(section_code);

-- ============================================================================
-- extreme_air_temperatures (0.1% of documents, array)
-- ============================================================================

CREATE TABLE extreme_air_temperatures (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    period              DOUBLE PRECISION NOT NULL,
    code                VARCHAR(5) NOT NULL,
    value               DOUBLE PRECISION NOT NULL,
    quantity            VARCHAR(5) NOT NULL
);

CREATE INDEX idx_extreme_air_temp_obs ON extreme_air_temperatures(observation_id);

-- ============================================================================
-- liquid_precipitations (1.1% of documents, array max length 2)
-- ============================================================================

CREATE TABLE liquid_precipitations (
    id                  SERIAL PRIMARY KEY,
    observation_id      INTEGER NOT NULL REFERENCES weather_observations(id) ON DELETE CASCADE,
    period              INTEGER NOT NULL,
    depth               INTEGER NOT NULL,
    condition           VARCHAR(5) NOT NULL,
    quality             VARCHAR(2) NOT NULL
);

CREATE INDEX idx_liquid_precip_obs ON liquid_precipitations(observation_id);
