import Papa from 'papaparse';

export interface TelemetryCSVRow {
  vehicleId: string;
  timestamp?: string;
  odometerKm: string;
  fuelLevelPercent: string;
  fuelConsumedLiters?: string;
  latitude?: string;
  longitude?: string;
  speedKmh?: string;
  engineTempCelsius?: string;
  engineHours?: string;
}

const REQUIRED_COLUMNS: (keyof TelemetryCSVRow)[] = [
  'vehicleId',
  'odometerKm',
  'fuelLevelPercent',
];

export function parseTelemetryCSV(csvText: string): TelemetryCSVRow[] {
  const result = Papa.parse<TelemetryCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  const rows = result.data;
  if (rows.length === 0) throw new Error('CSV file is empty');

  const headers = Object.keys(rows[0]) as (keyof TelemetryCSVRow)[];
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`CSV missing required columns: ${missing.join(', ')}`);
  }

  return rows;
}

export function toNumber(val: string | undefined, fallback = 0): number {
  const n = parseFloat(val ?? '');
  return isNaN(n) ? fallback : n;
}
