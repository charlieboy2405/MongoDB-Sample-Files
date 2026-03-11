/**
 * Verification Script: Validates the migrated data in PostgreSQL
 * against the source MongoDB JSON file.
 *
 * Usage: npx ts-node src/scripts/verify-migration.ts [path-to-json-file]
 */

import * as fs from "fs";
import * as readline from "readline";
import { PrismaClient } from "@prisma/client";
import { MongoWeatherDocument, MongoNumeric } from "../types/mongodb";

const prisma = new PrismaClient();

function extractNumber(val: MongoNumeric | undefined): number {
  if (!val) return 0;
  if ("$numberDouble" in val) return parseFloat(val.$numberDouble);
  if ("$numberInt" in val) return parseInt(val.$numberInt, 10);
  return 0;
}

function extractInt(val: { $numberInt: string } | undefined): number {
  if (!val) return 0;
  return parseInt(val.$numberInt, 10);
}

async function verify(filePath: string) {
  console.log("=== Starting Verification ===\n");

  // 1. Count verification
  const pgCount = await prisma.weatherObservation.count();
  let mongoCount = 0;
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) mongoCount++;
  }

  console.log(`MongoDB document count: ${mongoCount}`);
  console.log(`PostgreSQL record count: ${pgCount}`);
  console.log(
    `Count match: ${pgCount === mongoCount ? "PASS" : "FAIL"}\n`
  );

  // 2. Related table counts
  const relatedCounts = {
    atmosphericPressureChanges:
      await prisma.atmosphericPressureChange.count(),
    atmosphericPressureObservations:
      await prisma.atmosphericPressureObservation.count(),
    seaSurfaceTemperatures: await prisma.seaSurfaceTemperature.count(),
    waveMeasurements: await prisma.waveMeasurement.count(),
    skyConditionObservations:
      await prisma.skyConditionObservation.count(),
    pastWeatherObservations: await prisma.pastWeatherObservation.count(),
    presentWeatherObservations:
      await prisma.presentWeatherObservation.count(),
    skyCoverLayers: await prisma.skyCoverLayer.count(),
    extremeAirTemperatures: await prisma.extremeAirTemperature.count(),
    liquidPrecipitations: await prisma.liquidPrecipitation.count(),
  };

  console.log("Related table counts:");
  for (const [table, count] of Object.entries(relatedCounts)) {
    console.log(`  ${table}: ${count}`);
  }

  // 3. Spot-check random documents
  console.log("\n--- Spot-checking 5 random documents ---");

  const fileStream2 = fs.createReadStream(filePath);
  const rl2 = readline.createInterface({
    input: fileStream2,
    crlfDelay: Infinity,
  });

  const allDocs: MongoWeatherDocument[] = [];
  for await (const line of rl2) {
    if (line.trim()) allDocs.push(JSON.parse(line));
  }

  // Pick 5 random indices
  const indices = new Set<number>();
  while (indices.size < Math.min(5, allDocs.length)) {
    indices.add(Math.floor(Math.random() * allDocs.length));
  }

  let checksPass = 0;
  let checksFail = 0;

  for (const idx of indices) {
    const mongoDoc = allDocs[idx];
    const mongoId = mongoDoc._id.$oid;

    const pgRecord = await prisma.weatherObservation.findUnique({
      where: { mongoId },
      include: {
        atmosphericPressureChange: true,
        waveMeasurement: true,
        pastWeatherObservations: true,
        presentWeatherObservations: true,
      },
    });

    if (!pgRecord) {
      console.log(`  FAIL: Document ${mongoId} not found in Postgres`);
      checksFail++;
      continue;
    }

    // Verify core fields
    let docPassed = true;

    if (pgRecord.st !== mongoDoc.st) {
      console.log(
        `  FAIL [${mongoId}]: st mismatch: ${pgRecord.st} vs ${mongoDoc.st}`
      );
      docPassed = false;
    }

    if (pgRecord.callLetters !== mongoDoc.callLetters) {
      console.log(
        `  FAIL [${mongoId}]: callLetters mismatch: ${pgRecord.callLetters} vs ${mongoDoc.callLetters}`
      );
      docPassed = false;
    }

    const expectedTemp = extractNumber(mongoDoc.airTemperature.value);
    if (Math.abs(pgRecord.airTemperatureValue - expectedTemp) > 0.01) {
      console.log(
        `  FAIL [${mongoId}]: airTemperature mismatch: ${pgRecord.airTemperatureValue} vs ${expectedTemp}`
      );
      docPassed = false;
    }

    const expectedPressure = extractNumber(mongoDoc.pressure.value);
    if (Math.abs(pgRecord.pressureValue - expectedPressure) > 0.01) {
      console.log(
        `  FAIL [${mongoId}]: pressure mismatch: ${pgRecord.pressureValue} vs ${expectedPressure}`
      );
      docPassed = false;
    }

    const expectedWindAngle = extractInt(mongoDoc.wind.direction.angle);
    if (pgRecord.windDirectionAngle !== expectedWindAngle) {
      console.log(
        `  FAIL [${mongoId}]: windDirection mismatch: ${pgRecord.windDirectionAngle} vs ${expectedWindAngle}`
      );
      docPassed = false;
    }

    // Verify related records existence
    const hasAtmChange = !!mongoDoc.atmosphericPressureChange;
    const pgHasAtmChange = !!pgRecord.atmosphericPressureChange;
    if (hasAtmChange !== pgHasAtmChange) {
      console.log(
        `  FAIL [${mongoId}]: atmosphericPressureChange existence mismatch`
      );
      docPassed = false;
    }

    const hasWave = !!mongoDoc.waveMeasurement;
    const pgHasWave = !!pgRecord.waveMeasurement;
    if (hasWave !== pgHasWave) {
      console.log(
        `  FAIL [${mongoId}]: waveMeasurement existence mismatch`
      );
      docPassed = false;
    }

    const mongoPastCount = (mongoDoc.pastWeatherObservationManual ?? [])
      .length;
    const pgPastCount = pgRecord.pastWeatherObservations.length;
    if (mongoPastCount !== pgPastCount) {
      console.log(
        `  FAIL [${mongoId}]: pastWeatherObservation count mismatch: ${pgPastCount} vs ${mongoPastCount}`
      );
      docPassed = false;
    }

    const mongoPresentCount = (
      mongoDoc.presentWeatherObservationManual ?? []
    ).length;
    const pgPresentCount = pgRecord.presentWeatherObservations.length;
    if (mongoPresentCount !== pgPresentCount) {
      console.log(
        `  FAIL [${mongoId}]: presentWeatherObservation count mismatch: ${pgPresentCount} vs ${mongoPresentCount}`
      );
      docPassed = false;
    }

    if (docPassed) {
      checksPass++;
      console.log(`  PASS: Document ${mongoId} verified successfully`);
    } else {
      checksFail++;
    }
  }

  // 4. Summary
  console.log("\n=== Verification Summary ===");
  console.log(`Total count match: ${pgCount === mongoCount ? "PASS" : "FAIL"}`);
  console.log(`Spot checks passed: ${checksPass}/${checksPass + checksFail}`);
  console.log(
    `Overall: ${pgCount === mongoCount && checksFail === 0 ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`
  );

  return pgCount === mongoCount && checksFail === 0;
}

async function main() {
  const filePath =
    process.argv[2] || "../MongoDB/mongo-sample-weather.json";

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const success = await verify(filePath);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
