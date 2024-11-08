'use client'

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Settings, Printer, Box, Clock, DollarSign } from 'lucide-react';

type PrinterSettings = {
  nozzleDiameter: number;
  layerHeight: number;
  basePrintSpeed: number;
  wallSpeedFactor: number;
  infillSpeedFactor: number;
  supportSpeedFactor: number;
  materialCostPerKg: number;
  machineCostPerHour: number;
  materialDensity: number;
  numWalls: number;
  supportDensity: number;
};

type PartParams = {
  volume: number;
  boundingBoxVolume: number;
  convexHullVolume: number;
  surfaceArea: number;
  dimensionX: number;
  dimensionY: number;
  dimensionZ: number;
  infillRatio: number;
};

type Results = {
  totalCost: number;
  printTimeHours: number;
  shellRatio: number;
  shellPenalty: number;
  materialVolumeCm3: number;
  materialCost: number;
  machineCost: number;
  wallTimeHours: number;
  infillTimeHours: number;
};

const PRESETS: Record<string, PrinterSettings> = {
  "Standard 0.4mm": {
    nozzleDiameter: 0.4,
    layerHeight: 0.2,
    basePrintSpeed: 50,
    wallSpeedFactor: 0.8,
    infillSpeedFactor: 1.0,
    supportSpeedFactor: 1.2,
    materialCostPerKg: 25.0,
    machineCostPerHour: 2.0,
    materialDensity: 1.24,
    numWalls: 2,
    supportDensity: 0.2,
  },
  "Large 1.0mm": {
    nozzleDiameter: 1.0,
    layerHeight: 0.5,
    basePrintSpeed: 40,
    wallSpeedFactor: 0.8,
    infillSpeedFactor: 1.0,
    supportSpeedFactor: 1.2,
    materialCostPerKg: 25.0,
    machineCostPerHour: 2.0,
    materialDensity: 1.24,
    numWalls: 2,
    supportDensity: 0.2,
  },
  "High Speed 0.6mm": {
    nozzleDiameter: 0.6,
    layerHeight: 0.3,
    basePrintSpeed: 70,
    wallSpeedFactor: 0.8,
    infillSpeedFactor: 1.2,
    supportSpeedFactor: 1.4,
    materialCostPerKg: 25.0,
    machineCostPerHour: 2.0,
    materialDensity: 1.24,
    numWalls: 2,
    supportDensity: 0.2,
  }
};

const PART_PRESETS: Record<string, PartParams> = {
  "Small Part": {
    volume: 10000,        // 10cm³
    boundingBoxVolume: 15000,
    convexHullVolume: 12000,
    surfaceArea: 5000,
    dimensionX: 50,
    dimensionY: 25,
    dimensionZ: 15,
    infillRatio: 0.2,
  },
  "Large Solid Part": {
    volume: 1000000,      // 1000cm³
    boundingBoxVolume: 1200000,
    convexHullVolume: 1100000,
    surfaceArea: 150000,
    dimensionX: 200,
    dimensionY: 100,
    dimensionZ: 80,
    infillRatio: 0.3,
  },
  "Thin-Walled Part": {
    volume: 50000,        // 50cm³
    boundingBoxVolume: 200000,
    convexHullVolume: 180000,
    surfaceArea: 100000,
    dimensionX: 100,
    dimensionY: 100,
    dimensionZ: 20,
    infillRatio: 0.1,
  }
};

const PRINTER_SETTING_UNITS: { [key: string]: string } = {
  nozzleDiameter: "mm",
  layerHeight: "mm",
  basePrintSpeed: "mm/s",
  wallSpeedFactor: "× base speed",
  infillSpeedFactor: "× base speed",
  supportSpeedFactor: "× base speed",
  materialCostPerKg: "€/kg",
  machineCostPerHour: "€/hour",
  materialDensity: "g/cm³",
  numWalls: "count",
  supportDensity: "ratio"
};

const PART_PARAM_UNITS: { [key: string]: string } = {
  volume: "mm³",
  boundingBoxVolume: "mm³",
  convexHullVolume: "mm³",
  surfaceArea: "mm²",
  dimensionX: "mm",
  dimensionY: "mm",
  dimensionZ: "mm",
  infillRatio: "ratio"
};


export default function Home() {
  const [printerSettings, setPrinterSettings] = useState(PRESETS["Standard 0.4mm"]);
  const [partParams, setPartParams] = useState(PART_PRESETS["Small Part"]);
  const [results, setResults] = useState<Results | null>(null);

  const calculateResults = () => {
    const wallThickness = printerSettings.nozzleDiameter * printerSettings.numWalls;
    const shellVolume = Math.min(partParams.surfaceArea * wallThickness, partParams.volume);
    const internalVolume = partParams.volume - shellVolume;
    const infillVolume = internalVolume * partParams.infillRatio;
    const totalMaterialVolume = shellVolume + infillVolume;

    const shellRatio = shellVolume / totalMaterialVolume;
    const shellPenalty = 1.0 + Math.pow(shellRatio, 2) * 2.0;

    const crossSection = printerSettings.nozzleDiameter * printerSettings.layerHeight;
    const wallFlowRate = crossSection * printerSettings.basePrintSpeed * printerSettings.wallSpeedFactor;
    const infillFlowRate = crossSection * printerSettings.basePrintSpeed * printerSettings.infillSpeedFactor;

    const wallTime = shellVolume / wallFlowRate;
    const infillTime = infillVolume / infillFlowRate;
    const totalTime = ((wallTime + infillTime) * shellPenalty * 1.3) / 3600;

    const totalVolumeCm3 = totalMaterialVolume / 1000;
    const weightKg = (totalVolumeCm3 * printerSettings.materialDensity) / 1000;
    const materialCost = weightKg * printerSettings.materialCostPerKg;
    const machineCost = totalTime * printerSettings.machineCostPerHour;

    setResults({
      totalCost: materialCost + machineCost + 5.0,
      printTimeHours: totalTime,
      shellRatio,
      shellPenalty,
      materialVolumeCm3: totalVolumeCm3,
      materialCost,
      machineCost,
      wallTimeHours: wallTime / 3600,
      infillTimeHours: infillTime / 3600,
    });
  };

  const timeBreakdownData = results
      ? [
        { name: 'Walls', time: results.wallTimeHours },
        { name: 'Infill', time: results.infillTimeHours },
      ]
      : [];

  const costBreakdownData = results
      ? [
        { name: 'Material', cost: results.materialCost },
        { name: 'Machine', cost: results.machineCost },
        { name: 'Setup', cost: 5.0 },
      ]
      : [];

  return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Printer className="w-8 h-8" />
          <h1 className="text-2xl font-bold">3D Print Price Calculator</h1>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Printer Settings</h2>
            </div>
            <div className="mb-4">
              <label className="text-sm font-semibold">Preset Configurations:</label>
              <select
                  className="w-full border rounded p-2 mt-1"
                  onChange={(e) => setPrinterSettings(PRESETS[e.target.value])}
              >
                {Object.keys(PRESETS).map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {Object.entries(printerSettings).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()} ({PRINTER_SETTING_UNITS[key]}):
                    </label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                            setPrinterSettings((prev) => ({
                              ...prev,
                              [key]: parseFloat(e.target.value),
                            }))
                        }
                        className="border rounded p-1"
                        step="any"
                    />
                  </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Box className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Part Parameters</h2>
            </div>
            <div className="mb-4">
              <label className="text-sm font-semibold">Part Presets:</label>
              <select
                  className="w-full border rounded p-2 mt-1"
                  onChange={(e) => setPartParams(PART_PRESETS[e.target.value])}
              >
                {Object.keys(PART_PRESETS).map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {Object.entries(partParams).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()} ({PART_PARAM_UNITS[key]}):
                    </label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                            setPartParams((prev) => ({
                              ...prev,
                              [key]: parseFloat(e.target.value),
                            }))
                        }
                        className="border rounded p-1"
                        step="any"
                    />
                  </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <button
                className="w-full p-2 bg-blue-500 text-white rounded-lg font-semibold"
                onClick={calculateResults}
            >
              Calculate
            </button>

            {results && (
                <div className="p-4 border rounded-lg bg-blue-50 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">Cost Breakdown</h2>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">Total Cost: €{results.totalCost.toFixed(2)}</p>
                    <p>Material Cost: €{results.materialCost.toFixed(2)}</p>
                    <p>Machine Cost: €{results.machineCost.toFixed(2)}</p>
                    <p>Setup Cost: €5.00</p>
                  </div>
                  <div className="mt-4 h-36">
                    <LineChart width={300} height={150} data={costBreakdownData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="cost" stroke="#8884d8" />
                    </LineChart>
                  </div>
                </div>
            )}

            {results && (
                <div className="p-4 border rounded-lg bg-blue-50 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">Time Analysis</h2>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">Total Print Time: {results.printTimeHours.toFixed(2)} hours</p>
                    <p>Wall Print Time: {results.wallTimeHours.toFixed(2)} hours</p>
                    <p>Infill Print Time: {results.infillTimeHours.toFixed(2)} hours</p>
                    <p>Shell Ratio: {results.shellRatio.toFixed(3)}</p>
                    <p>Shell Penalty: {results.shellPenalty.toFixed(2)}x</p>
                    <p>Material Volume: {results.materialVolumeCm3.toFixed(2)} cm³</p>
                  </div>
                  <div className="mt-4 h-36">
                    <LineChart width={300} height={150} data={timeBreakdownData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="time" stroke="#82ca9d" />
                    </LineChart>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}