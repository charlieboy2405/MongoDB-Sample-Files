/**
 * Data Migration Script: MongoDB JSON -> PostgreSQL
 *
 * Reads the MongoDB Extended JSON export file and inserts all records
 * into the PostgreSQL database using Prisma, with proper relational mapping.
 *
 * Usage: npx ts-node src/scripts/migrate-data.ts [path-to-json-file]
 */

import * as fs from "fs";
import * as readline from "readline";
import { PrismaClient } from "@prisma/client";
import { MongoWeatherDocument, MongoNumeric } from "../types/mongodb";

const prisma = new PrismaClient();

const BATCH_SIZE = 500;

/** Extract numeric value from MongoDB Extended JSON */
function extractNumber(val: MongoNumeric | undefined): number {
  if (!val) return 0;
  if ("$numberDouble" in val) return parseFloat(val.$numberDouble);
  if ("$numberInt" in val) return parseInt(val.$numberInt, 10);
  return 0;
}

/** Extract integer from MongoDB $numberInt */
function extractInt(val: { $numberInt: string } | undefined): number {
  if (!val) return 0;
  return parseInt(val.$numberInt, 10);
}

/** Extract timestamp from MongoDB Extended JSON date */
function extractDate(val: MongoWeatherDocument["ts"]): Date {
  const ms = parseInt(val.$date.$numberLong, 10);
  return new Date(ms);
}

interface ObservationCreateInput {
  mongoId: string;
  st: string;
  ts: Date;
  longitude: number | null;
  latitude: number | null;
  positionType: string | null;
  elevation: number;
  callLetters: string;
  qualityControlProcess: string;
  dataSource: string;
  type: string;
  airTemperatureValue: number;
  airTemperatureQuality: string;
  dewPointValue: number;
  dewPointQuality: string;
  pressureValue: number;
  pressureQuality: string;
  windDirectionAngle: number;
  windDirectionQuality: string;
  windType: string;
  windSpeedRate: number;
  windSpeedQuality: string;
  visibilityDistanceValue: number;
  visibilityDistanceQuality: string;
  visibilityVariabilityValue: string;
  visibilityVariabilityQuality: string;
  skyConditionCeilingHeightValue: number;
  skyConditionCeilingHeightQuality: string;
  skyConditionCeilingHeightDetermination: string;
  skyConditionCavok: string;
  precipEstDiscrepancy: string;
  precipEstWaterDepth: number;
  sections: string[];
}

/** Transform a single MongoDB document into Prisma create input */
function transformDocument(doc: MongoWeatherDocument): {
  observation: ObservationCreateInput;
  atmosphericPressureChange?: {
    tendencyCode: string;
    tendencyQuality: string;
    quantity3HoursValue: number;
    quantity3HoursQuality: string;
    quantity24HoursValue: number;
    quantity24HoursQuality: string;
  };
  atmosphericPressureObservation?: {
    stationPressureValue: number;
    stationPressureQuality: string;
    altimeterSettingValue: number;
    altimeterSettingQuality: string;
  };
  seaSurfaceTemperature?: {
    value: number;
    quality: string;
  };
  waveMeasurement?: {
    method: string;
    wavePeriod: number;
    waveHeight: number;
    waveQuality: string;
    seaStateCode: string;
    seaStateQuality: string;
  };
  skyConditionObservation?: {
    totalCoverageValue: string;
    totalCoverageOpaque: string;
    totalCoverageQuality: string;
    lowestCloudCoverageValue: string;
    lowestCloudCoverageQuality: string;
    lowCloudGenusValue: string;
    lowCloudGenusQuality: string;
    lowestCloudBaseHeightValue: number;
    lowestCloudBaseHeightQuality: string;
    midCloudGenusValue: string;
    midCloudGenusQuality: string;
    highCloudGenusValue: string;
    highCloudGenusQuality: string;
  };
  pastWeatherObservations: Array<{
    atmosphericConditionValue: string;
    atmosphericConditionQuality: string;
    periodValue: number;
    periodQuality: string;
  }>;
  presentWeatherObservations: Array<{
    condition: string;
    quality: string;
  }>;
  skyCoverLayers: Array<{
    coverageValue: string;
    coverageQuality: string;
    baseHeightValue: number;
    baseHeightQuality: string;
    cloudTypeValue: string;
    cloudTypeQuality: string;
  }>;
  extremeAirTemperatures: Array<{
    code: string;
    value: number;
    period: number;
    quantity: string;
  }>;
  liquidPrecipitations: Array<{
    condition: string;
    depth: number;
    period: number;
    quality: string;
  }>;
} {
  // Main observation
  const observation: ObservationCreateInput = {
    mongoId: doc._id.$oid,
    st: doc.st,
    ts: extractDate(doc.ts),
    longitude: doc.position?.coordinates?.[0]
      ? extractNumber(doc.position.coordinates[0])
      : null,
    latitude: doc.position?.coordinates?.[1]
      ? extractNumber(doc.position.coordinates[1])
      : null,
    positionType: doc.position?.type ?? null,
    elevation: extractInt(doc.elevation),
    callLetters: doc.callLetters,
    qualityControlProcess: doc.qualityControlProcess,
    dataSource: doc.dataSource,
    type: doc.type,
    airTemperatureValue: extractNumber(doc.airTemperature.value),
    airTemperatureQuality: doc.airTemperature.quality,
    dewPointValue: extractNumber(doc.dewPoint.value),
    dewPointQuality: doc.dewPoint.quality,
    pressureValue: extractNumber(doc.pressure.value),
    pressureQuality: doc.pressure.quality,
    windDirectionAngle: extractInt(doc.wind.direction.angle),
    windDirectionQuality: doc.wind.direction.quality,
    windType: doc.wind.type,
    windSpeedRate: extractNumber(doc.wind.speed.rate),
    windSpeedQuality: doc.wind.speed.quality,
    visibilityDistanceValue: extractInt(doc.visibility.distance.value),
    visibilityDistanceQuality: doc.visibility.distance.quality,
    visibilityVariabilityValue: doc.visibility.variability.value,
    visibilityVariabilityQuality: doc.visibility.variability.quality,
    skyConditionCeilingHeightValue: extractInt(
      doc.skyCondition.ceilingHeight.value
    ),
    skyConditionCeilingHeightQuality: doc.skyCondition.ceilingHeight.quality,
    skyConditionCeilingHeightDetermination:
      doc.skyCondition.ceilingHeight.determination,
    skyConditionCavok: doc.skyCondition.cavok,
    precipEstDiscrepancy: doc.precipitationEstimatedObservation.discrepancy,
    precipEstWaterDepth: extractInt(
      doc.precipitationEstimatedObservation.estimatedWaterDepth
    ),
    sections: doc.sections,
  };

  // Optional: Atmospheric pressure change
  const atmosphericPressureChange = doc.atmosphericPressureChange
    ? {
        tendencyCode: doc.atmosphericPressureChange.tendency.code,
        tendencyQuality: doc.atmosphericPressureChange.tendency.quality,
        quantity3HoursValue: extractNumber(
          doc.atmosphericPressureChange.quantity3Hours.value
        ),
        quantity3HoursQuality:
          doc.atmosphericPressureChange.quantity3Hours.quality,
        quantity24HoursValue: extractNumber(
          doc.atmosphericPressureChange.quantity24Hours.value
        ),
        quantity24HoursQuality:
          doc.atmosphericPressureChange.quantity24Hours.quality,
      }
    : undefined;

  // Optional: Atmospheric pressure observation
  const atmosphericPressureObservation = doc.atmosphericPressureObservation
    ? {
        stationPressureValue: extractNumber(
          doc.atmosphericPressureObservation.stationPressure.value
        ),
        stationPressureQuality:
          doc.atmosphericPressureObservation.stationPressure.quality,
        altimeterSettingValue: extractNumber(
          doc.atmosphericPressureObservation.altimeterSetting.value
        ),
        altimeterSettingQuality:
          doc.atmosphericPressureObservation.altimeterSetting.quality,
      }
    : undefined;

  // Optional: Sea surface temperature
  const seaSurfaceTemperature = doc.seaSurfaceTemperature
    ? {
        value: extractNumber(doc.seaSurfaceTemperature.value),
        quality: doc.seaSurfaceTemperature.quality,
      }
    : undefined;

  // Optional: Wave measurement
  const waveMeasurement = doc.waveMeasurement
    ? {
        method: doc.waveMeasurement.method,
        wavePeriod: extractInt(doc.waveMeasurement.waves.period),
        waveHeight: extractNumber(doc.waveMeasurement.waves.height),
        waveQuality: doc.waveMeasurement.waves.quality,
        seaStateCode: doc.waveMeasurement.seaState.code,
        seaStateQuality: doc.waveMeasurement.seaState.quality,
      }
    : undefined;

  // Optional: Sky condition observation
  const skyConditionObservation = doc.skyConditionObservation
    ? {
        totalCoverageValue: doc.skyConditionObservation.totalCoverage.value,
        totalCoverageOpaque: doc.skyConditionObservation.totalCoverage.opaque,
        totalCoverageQuality: doc.skyConditionObservation.totalCoverage.quality,
        lowestCloudCoverageValue:
          doc.skyConditionObservation.lowestCloudCoverage.value,
        lowestCloudCoverageQuality:
          doc.skyConditionObservation.lowestCloudCoverage.quality,
        lowCloudGenusValue: doc.skyConditionObservation.lowCloudGenus.value,
        lowCloudGenusQuality: doc.skyConditionObservation.lowCloudGenus.quality,
        lowestCloudBaseHeightValue: extractInt(
          doc.skyConditionObservation.lowestCloudBaseHeight.value
        ),
        lowestCloudBaseHeightQuality:
          doc.skyConditionObservation.lowestCloudBaseHeight.quality,
        midCloudGenusValue: doc.skyConditionObservation.midCloudGenus.value,
        midCloudGenusQuality: doc.skyConditionObservation.midCloudGenus.quality,
        highCloudGenusValue: doc.skyConditionObservation.highCloudGenus.value,
        highCloudGenusQuality:
          doc.skyConditionObservation.highCloudGenus.quality,
      }
    : undefined;

  // Array: Past weather observations
  const pastWeatherObservations = (
    doc.pastWeatherObservationManual ?? []
  ).map((pwo) => ({
    atmosphericConditionValue: pwo.atmosphericCondition.value,
    atmosphericConditionQuality: pwo.atmosphericCondition.quality,
    periodValue: extractInt(pwo.period.value),
    periodQuality: pwo.period.quality,
  }));

  // Array: Present weather observations
  const presentWeatherObservations = (
    doc.presentWeatherObservationManual ?? []
  ).map((pwo) => ({
    condition: pwo.condition,
    quality: pwo.quality,
  }));

  // Array: Sky cover layers
  const skyCoverLayers = (doc.skyCoverLayer ?? []).map((scl) => ({
    coverageValue: scl.coverage.value,
    coverageQuality: scl.coverage.quality,
    baseHeightValue: extractInt(scl.baseHeight.value),
    baseHeightQuality: scl.baseHeight.quality,
    cloudTypeValue: scl.cloudType.value,
    cloudTypeQuality: scl.cloudType.quality,
  }));

  // Array: Extreme air temperatures
  const extremeAirTemperatures = (doc.extremeAirTemperature ?? []).map(
    (eat) => ({
      code: eat.code,
      value: extractNumber(eat.value),
      period: extractNumber(eat.period),
      quantity: eat.quantity,
    })
  );

  // Array: Liquid precipitations
  const liquidPrecipitations = (doc.liquidPrecipitation ?? []).map((lp) => ({
    condition: lp.condition,
    depth: extractInt(lp.depth),
    period: extractInt(lp.period),
    quality: lp.quality,
  }));

  return {
    observation,
    atmosphericPressureChange,
    atmosphericPressureObservation,
    seaSurfaceTemperature,
    waveMeasurement,
    skyConditionObservation,
    pastWeatherObservations,
    presentWeatherObservations,
    skyCoverLayers,
    extremeAirTemperatures,
    liquidPrecipitations,
  };
}

async function migrateData(filePath: string) {
  console.log(`Starting migration from: ${filePath}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let totalProcessed = 0;
  let totalErrors = 0;
  let batch: ReturnType<typeof transformDocument>[] = [];

  const startTime = Date.now();

  async function processBatch(
    items: ReturnType<typeof transformDocument>[]
  ): Promise<void> {
    // Use a transaction for each batch
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const obs = await tx.weatherObservation.create({
          data: item.observation,
        });

        const observationId = obs.id;

        // Create related records
        const promises: Promise<unknown>[] = [];

        if (item.atmosphericPressureChange) {
          promises.push(
            tx.atmosphericPressureChange.create({
              data: { observationId, ...item.atmosphericPressureChange },
            })
          );
        }

        if (item.atmosphericPressureObservation) {
          promises.push(
            tx.atmosphericPressureObservation.create({
              data: { observationId, ...item.atmosphericPressureObservation },
            })
          );
        }

        if (item.seaSurfaceTemperature) {
          promises.push(
            tx.seaSurfaceTemperature.create({
              data: { observationId, ...item.seaSurfaceTemperature },
            })
          );
        }

        if (item.waveMeasurement) {
          promises.push(
            tx.waveMeasurement.create({
              data: { observationId, ...item.waveMeasurement },
            })
          );
        }

        if (item.skyConditionObservation) {
          promises.push(
            tx.skyConditionObservation.create({
              data: { observationId, ...item.skyConditionObservation },
            })
          );
        }

        if (item.pastWeatherObservations.length > 0) {
          promises.push(
            tx.pastWeatherObservation.createMany({
              data: item.pastWeatherObservations.map((pwo) => ({
                observationId,
                ...pwo,
              })),
            })
          );
        }

        if (item.presentWeatherObservations.length > 0) {
          promises.push(
            tx.presentWeatherObservation.createMany({
              data: item.presentWeatherObservations.map((pwo) => ({
                observationId,
                ...pwo,
              })),
            })
          );
        }

        if (item.skyCoverLayers.length > 0) {
          promises.push(
            tx.skyCoverLayer.createMany({
              data: item.skyCoverLayers.map((scl) => ({
                observationId,
                ...scl,
              })),
            })
          );
        }

        if (item.extremeAirTemperatures.length > 0) {
          promises.push(
            tx.extremeAirTemperature.createMany({
              data: item.extremeAirTemperatures.map((eat) => ({
                observationId,
                ...eat,
              })),
            })
          );
        }

        if (item.liquidPrecipitations.length > 0) {
          promises.push(
            tx.liquidPrecipitation.createMany({
              data: item.liquidPrecipitations.map((lp) => ({
                observationId,
                ...lp,
              })),
            })
          );
        }

        await Promise.all(promises);
      }
    });
  }

  for await (const line of rl) {
    if (!line.trim()) continue;

    // Parse and transform each line individually so a single bad document
    // doesn't discard the entire accumulated batch
    let transformed: ReturnType<typeof transformDocument>;
    try {
      const doc: MongoWeatherDocument = JSON.parse(line);
      transformed = transformDocument(doc);
    } catch (parseError) {
      totalErrors += 1;
      if (totalErrors <= 10) {
        console.error(`  Error parsing/transforming document: ${parseError}`);
      }
      continue;
    }

    batch.push(transformed);

    if (batch.length >= BATCH_SIZE) {
      try {
        await processBatch(batch);
        totalProcessed += batch.length;
      } catch (batchError) {
        totalErrors += batch.length;
        if (totalErrors <= 10 * BATCH_SIZE) {
          console.error(`  Error processing batch of ${batch.length} documents: ${batchError}`);
        }
      }
      batch = [];
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `  Migrated ${totalProcessed} records (${elapsed}s elapsed)`
      );
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    try {
      await processBatch(batch);
      totalProcessed += batch.length;
    } catch (error) {
      const failedCount = batch.length;
      totalErrors += failedCount;
      console.error(`  Error processing final batch of ${failedCount} documents: ${error}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n=== Migration Complete ===");
  console.log(`Total records migrated: ${totalProcessed}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total time: ${totalTime}s`);
  console.log(
    `Throughput: ${(totalProcessed / (parseFloat(totalTime) || 1)).toFixed(0)} records/sec`
  );
}

async function main() {
  const filePath =
    process.argv[2] || "../MongoDB/mongo-sample-weather.json";

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    await migrateData(filePath);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
