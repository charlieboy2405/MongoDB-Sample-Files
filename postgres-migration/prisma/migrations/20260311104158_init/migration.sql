-- CreateTable
CREATE TABLE "weather_observations" (
    "id" SERIAL NOT NULL,
    "mongo_id" TEXT NOT NULL,
    "st" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "position_type" TEXT,
    "elevation" INTEGER NOT NULL,
    "call_letters" TEXT NOT NULL,
    "quality_control_process" TEXT NOT NULL,
    "data_source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "air_temperature_value" DOUBLE PRECISION NOT NULL,
    "air_temperature_quality" TEXT NOT NULL,
    "dew_point_value" DOUBLE PRECISION NOT NULL,
    "dew_point_quality" TEXT NOT NULL,
    "pressure_value" DOUBLE PRECISION NOT NULL,
    "pressure_quality" TEXT NOT NULL,
    "wind_direction_angle" INTEGER NOT NULL,
    "wind_direction_quality" TEXT NOT NULL,
    "wind_type" TEXT NOT NULL,
    "wind_speed_rate" DOUBLE PRECISION NOT NULL,
    "wind_speed_quality" TEXT NOT NULL,
    "visibility_distance_value" INTEGER NOT NULL,
    "visibility_distance_quality" TEXT NOT NULL,
    "visibility_variability_value" TEXT NOT NULL,
    "visibility_variability_quality" TEXT NOT NULL,
    "sky_condition_ceiling_height_value" INTEGER NOT NULL,
    "sky_condition_ceiling_height_quality" TEXT NOT NULL,
    "sky_condition_ceiling_height_determination" TEXT NOT NULL,
    "sky_condition_cavok" TEXT NOT NULL,
    "precip_est_discrepancy" TEXT NOT NULL,
    "precip_est_water_depth" INTEGER NOT NULL,
    "sections" TEXT[],

    CONSTRAINT "weather_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atmospheric_pressure_changes" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "tendency_code" TEXT NOT NULL,
    "tendency_quality" TEXT NOT NULL,
    "quantity_3hours_value" DOUBLE PRECISION NOT NULL,
    "quantity_3hours_quality" TEXT NOT NULL,
    "quantity_24hours_value" DOUBLE PRECISION NOT NULL,
    "quantity_24hours_quality" TEXT NOT NULL,

    CONSTRAINT "atmospheric_pressure_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atmospheric_pressure_observations" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "station_pressure_value" DOUBLE PRECISION NOT NULL,
    "station_pressure_quality" TEXT NOT NULL,
    "altimeter_setting_value" DOUBLE PRECISION NOT NULL,
    "altimeter_setting_quality" TEXT NOT NULL,

    CONSTRAINT "atmospheric_pressure_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sea_surface_temperatures" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quality" TEXT NOT NULL,

    CONSTRAINT "sea_surface_temperatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wave_measurements" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "wave_period" INTEGER NOT NULL,
    "wave_height" DOUBLE PRECISION NOT NULL,
    "wave_quality" TEXT NOT NULL,
    "sea_state_code" TEXT NOT NULL,
    "sea_state_quality" TEXT NOT NULL,

    CONSTRAINT "wave_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sky_condition_observations" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "total_coverage_value" TEXT NOT NULL,
    "total_coverage_opaque" TEXT NOT NULL,
    "total_coverage_quality" TEXT NOT NULL,
    "lowest_cloud_coverage_value" TEXT NOT NULL,
    "lowest_cloud_coverage_quality" TEXT NOT NULL,
    "low_cloud_genus_value" TEXT NOT NULL,
    "low_cloud_genus_quality" TEXT NOT NULL,
    "lowest_cloud_base_height_value" INTEGER NOT NULL,
    "lowest_cloud_base_height_quality" TEXT NOT NULL,
    "mid_cloud_genus_value" TEXT NOT NULL,
    "mid_cloud_genus_quality" TEXT NOT NULL,
    "high_cloud_genus_value" TEXT NOT NULL,
    "high_cloud_genus_quality" TEXT NOT NULL,

    CONSTRAINT "sky_condition_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "past_weather_observations" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "atmospheric_condition_value" TEXT NOT NULL,
    "atmospheric_condition_quality" TEXT NOT NULL,
    "period_value" INTEGER NOT NULL,
    "period_quality" TEXT NOT NULL,

    CONSTRAINT "past_weather_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "present_weather_observations" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "quality" TEXT NOT NULL,

    CONSTRAINT "present_weather_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sky_cover_layers" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "coverage_value" TEXT NOT NULL,
    "coverage_quality" TEXT NOT NULL,
    "base_height_value" INTEGER NOT NULL,
    "base_height_quality" TEXT NOT NULL,
    "cloud_type_value" TEXT NOT NULL,
    "cloud_type_quality" TEXT NOT NULL,

    CONSTRAINT "sky_cover_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extreme_air_temperatures" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "period" DOUBLE PRECISION NOT NULL,
    "quantity" TEXT NOT NULL,

    CONSTRAINT "extreme_air_temperatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquid_precipitations" (
    "id" SERIAL NOT NULL,
    "observation_id" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "quality" TEXT NOT NULL,

    CONSTRAINT "liquid_precipitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_observations_mongo_id_key" ON "weather_observations"("mongo_id");

-- CreateIndex
CREATE INDEX "weather_observations_st_idx" ON "weather_observations"("st");

-- CreateIndex
CREATE INDEX "weather_observations_ts_idx" ON "weather_observations"("ts");

-- CreateIndex
CREATE INDEX "weather_observations_call_letters_idx" ON "weather_observations"("call_letters");

-- CreateIndex
CREATE INDEX "weather_observations_type_idx" ON "weather_observations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "atmospheric_pressure_changes_observation_id_key" ON "atmospheric_pressure_changes"("observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "atmospheric_pressure_observations_observation_id_key" ON "atmospheric_pressure_observations"("observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sea_surface_temperatures_observation_id_key" ON "sea_surface_temperatures"("observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "wave_measurements_observation_id_key" ON "wave_measurements"("observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sky_condition_observations_observation_id_key" ON "sky_condition_observations"("observation_id");

-- CreateIndex
CREATE INDEX "past_weather_observations_observation_id_idx" ON "past_weather_observations"("observation_id");

-- CreateIndex
CREATE INDEX "present_weather_observations_observation_id_idx" ON "present_weather_observations"("observation_id");

-- CreateIndex
CREATE INDEX "sky_cover_layers_observation_id_idx" ON "sky_cover_layers"("observation_id");

-- CreateIndex
CREATE INDEX "extreme_air_temperatures_observation_id_idx" ON "extreme_air_temperatures"("observation_id");

-- CreateIndex
CREATE INDEX "liquid_precipitations_observation_id_idx" ON "liquid_precipitations"("observation_id");

-- AddForeignKey
ALTER TABLE "atmospheric_pressure_changes" ADD CONSTRAINT "atmospheric_pressure_changes_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atmospheric_pressure_observations" ADD CONSTRAINT "atmospheric_pressure_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sea_surface_temperatures" ADD CONSTRAINT "sea_surface_temperatures_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wave_measurements" ADD CONSTRAINT "wave_measurements_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sky_condition_observations" ADD CONSTRAINT "sky_condition_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_weather_observations" ADD CONSTRAINT "past_weather_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "present_weather_observations" ADD CONSTRAINT "present_weather_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sky_cover_layers" ADD CONSTRAINT "sky_cover_layers_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extreme_air_temperatures" ADD CONSTRAINT "extreme_air_temperatures_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquid_precipitations" ADD CONSTRAINT "liquid_precipitations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "weather_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
