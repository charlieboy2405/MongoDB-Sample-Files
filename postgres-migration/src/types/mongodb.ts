/**
 * TypeScript interfaces representing the MongoDB document schema
 * for weather observation data (Extended JSON format).
 */

export interface MongoNumberDouble {
  $numberDouble: string;
}

export interface MongoNumberInt {
  $numberInt: string;
}

export interface MongoOid {
  $oid: string;
}

export interface MongoDate {
  $date: {
    $numberLong: string;
  };
}

export type MongoNumeric = MongoNumberDouble | MongoNumberInt;

export interface QualityValue<T> {
  value: T;
  quality: string;
}

export interface MongoWeatherDocument {
  _id: MongoOid;
  st: string;
  ts: MongoDate;
  position?: {
    type: string;
    coordinates: MongoNumeric[];
  };
  elevation: MongoNumberInt;
  callLetters: string;
  qualityControlProcess: string;
  dataSource: string;
  type: string;

  airTemperature: QualityValue<MongoNumeric>;
  dewPoint: QualityValue<MongoNumeric>;
  pressure: QualityValue<MongoNumeric>;

  wind: {
    direction: {
      angle: MongoNumberInt;
      quality: string;
    };
    type: string;
    speed: {
      rate: MongoNumeric;
      quality: string;
    };
  };

  visibility: {
    distance: {
      value: MongoNumberInt;
      quality: string;
    };
    variability: {
      value: string;
      quality: string;
    };
  };

  skyCondition: {
    ceilingHeight: {
      value: MongoNumberInt;
      quality: string;
      determination: string;
    };
    cavok: string;
  };

  sections: string[];

  precipitationEstimatedObservation: {
    discrepancy: string;
    estimatedWaterDepth: MongoNumberInt;
  };

  // Optional sub-documents
  atmosphericPressureChange?: {
    tendency: {
      code: string;
      quality: string;
    };
    quantity3Hours: QualityValue<MongoNumeric>;
    quantity24Hours: QualityValue<MongoNumeric>;
  };

  atmosphericPressureObservation?: {
    stationPressure: QualityValue<MongoNumeric>;
    altimeterSetting: QualityValue<MongoNumeric>;
  };

  seaSurfaceTemperature?: {
    value: MongoNumeric;
    quality: string;
  };

  waveMeasurement?: {
    method: string;
    waves: {
      period: MongoNumberInt;
      height: MongoNumeric;
      quality: string;
    };
    seaState: {
      code: string;
      quality: string;
    };
  };

  skyConditionObservation?: {
    totalCoverage: {
      value: string;
      opaque: string;
      quality: string;
    };
    lowestCloudCoverage: {
      value: string;
      quality: string;
    };
    lowCloudGenus: {
      value: string;
      quality: string;
    };
    lowestCloudBaseHeight: {
      value: MongoNumberInt;
      quality: string;
    };
    midCloudGenus: {
      value: string;
      quality: string;
    };
    highCloudGenus: {
      value: string;
      quality: string;
    };
  };

  pastWeatherObservationManual?: Array<{
    atmosphericCondition: {
      value: string;
      quality: string;
    };
    period: {
      value: MongoNumberInt;
      quality: string;
    };
  }>;

  presentWeatherObservationManual?: Array<{
    condition: string;
    quality: string;
  }>;

  skyCoverLayer?: Array<{
    coverage: {
      value: string;
      quality: string;
    };
    baseHeight: {
      value: MongoNumberInt;
      quality: string;
    };
    cloudType: {
      value: string;
      quality: string;
    };
  }>;

  extremeAirTemperature?: Array<{
    code: string;
    value: MongoNumberDouble;
    period: MongoNumberDouble;
    quantity: string;
  }>;

  liquidPrecipitation?: Array<{
    condition: string;
    depth: MongoNumberInt;
    period: MongoNumberInt;
    quality: string;
  }>;
}
