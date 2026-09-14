import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatNumber, selectedCalculation, calculationStatus, resultsCsv } from '../assets/result-view.js';

// The published core starts with Vite's modulepreload feature detection.
// No DOM is needed to test its pure calculation exports or its state actions.
globalThis.document = { createElement: () => ({ relList: { supports: () => true } }) };
const { calculateSnapshot, initialGeometry, initialMechanics, useSimulatorStore, serializeConfiguration } =
  await import('../assets/simulator-core-v0.2.js');
const calculate = (geometry = {}, mechanics = {}) =>
  calculateSnapshot({ ...initialGeometry, ...geometry }, { ...initialMechanics, ...mechanics });
const section = snapshot => snapshot.results.mechanics.sectionsByHingeId['front-hinge-1'];
const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(Math.abs(expected), 1e-30), `${actual} != ${expected}`);
const defaultSnapshot = calculate();
function teachingExample() {
  const overrides = defaultSnapshot.geometry.fourSideWrapper.segments.filter(s => s.kind === 'hinge').map(hinge => ({
    hingeId: hinge.id, driveMode: 'measured-free-curvature',
    measuredFreeCurvaturePerM: [165500, 40600, 18500][hinge.index - 1],
  }));
  return calculate({}, { driveMode: 'measured-free-curvature', hingeOverrides: overrides });
}

test('published defaults reproduce the supplied derivation, including 12.7586 degrees', () => {
  const s = section(defaultSnapshot);
  close(s.zNeutralM, 110e-9);
  close(s.bendingStiffnessNm2, 8.73e-15);
  close(s.actuationMomentNm, 6.48e-11);
  close(s.freeCurvaturePerM, 7422.680412371134);
  close(defaultSnapshot.results.mechanics.hinges[0].freeThetaRad * 180 / Math.PI, 12.758647809098752);
  const meanOutputMoment = s.actuationMomentNm - s.bendingStiffnessNm2 * (0.12 / 30e-6);
  close(meanOutputMoment, 2.988e-11);
  close(meanOutputMoment / 250e-6 / (400e-6 * 400e-6), 0.747);
});

test('independent layer-centroid calculation matches the core for unequal layer thicknesses', () => {
  for (const [tAu, tPd, eAu, ePd] of [[70e-9, 180e-9, 60e9, 135e9], [220e-9, 40e-9, 95e9, 105e9]]) {
    const width = 17e-6 * 7;
    const zAu = tAu / 2, zPd = tAu + tPd / 2;
    const zN = (eAu * tAu * zAu + ePd * tPd * zPd) / (eAu * tAu + ePd * tPd);
    const EI = width * (eAu * (tAu ** 3 / 12 + tAu * (zAu - zN) ** 2)
      + ePd * (tPd ** 3 / 12 + tPd * (zPd - zN) ** 2));
    const actuationMoment = width * (eAu * tAu * (zAu - zN) * 0.0002 + ePd * tPd * (zPd - zN) * 0.0021);
    const actual = section(calculate({}, { auThicknessM: tAu, pdThicknessM: tPd, auYoungModulusPa: eAu,
      pdYoungModulusPa: ePd, singleStripWidthM: 17e-6, numberOfParallelActuators: 7, auEigenstrain: 0.0002, pdEigenstrain: 0.0021 }));
    close(actual.zNeutralM, zN);
    close(actual.bendingStiffnessNm2, EI);
    close(actual.freeCurvaturePerM, actuationMoment / EI);
  }
});

test('equal layer eigenstrains do not cause curvature; reversing mismatch reverses curvature', () => {
  close(section(calculate({}, { auEigenstrain: 0.001, pdEigenstrain: 0.001 })).freeCurvaturePerM, 0);
  close(section(calculate({}, { auEigenstrain: 0.001, pdEigenstrain: 0 })).freeCurvaturePerM,
    -section(defaultSnapshot).freeCurvaturePerM);
  close(section(calculate({}, { auEigenstrain: 0.002, pdEigenstrain: 0.003 })).freeCurvaturePerM,
    section(defaultSnapshot).freeCurvaturePerM);
});

test('parallel metal width scales moments and stiffness but not free angle', () => {
  const doubled = calculate({}, { numberOfParallelActuators: 18 });
  close(section(doubled).bendingStiffnessNm2, 2 * section(defaultSnapshot).bendingStiffnessNm2);
  close(section(doubled).freeCurvaturePerM, section(defaultSnapshot).freeCurvaturePerM);
  close(doubled.results.mechanics.hinges[0].freeThetaRad, defaultSnapshot.results.mechanics.hinges[0].freeThetaRad);
  close(doubled.results.mechanics.hinges[0].outputMomentNm, 2 * defaultSnapshot.results.mechanics.hinges[0].outputMomentNm);
});

test('only exposed bending length affects free angle; display width and thickness are not metal EI', () => {
  close(calculate({ hingeLengthM: 60e-6 }).results.mechanics.hinges[0].freeThetaRad,
    2 * defaultSnapshot.results.mechanics.hinges[0].freeThetaRad);
  const visual = calculate({ hingeWidthM: 500e-6, hingeThicknessM: 40e-6 });
  close(section(visual).bendingStiffnessNm2, section(defaultSnapshot).bendingStiffnessNm2);
  close(section(visual).freeCurvaturePerM, section(defaultSnapshot).freeCurvaturePerM);
});

test('state input units, hinge count, override resolution and zero-length failure remain coherent', () => {
  const state = useSimulatorStore.getState();
  state.setGeometryInput('panelsPerSide', 6);
  assert.equal(useSimulatorStore.getState().scientificSnapshot.results.mechanics.hinges.length, 24);
  state.setMechanicsInput('singleStripWidthM', 20e-6);
  close(section(useSimulatorStore.getState().scientificSnapshot).resolvedInput.singleStripWidthM, 20e-6);
  state.setHingeOverride('front-hinge-1', { pdEigenstrain: 0.002 });
  const changed = useSimulatorStore.getState().scientificSnapshot;
  close(section(changed).freeCurvaturePerM, 2 * section(defaultSnapshot).freeCurvaturePerM);
  close(changed.results.mechanics.sectionsByHingeId['right-hinge-1'].freeCurvaturePerM,
    section(defaultSnapshot).freeCurvaturePerM);
  state.setGeometryInput('hingeLengthM', 0);
  assert.equal(useSimulatorStore.getState().scientificSnapshot.results.isComplete, false);
});

test('default invalid contact loads retain signed diagnostics, never become zero or absolute values', () => {
  const { results, geometry } = defaultSnapshot;
  assert.equal(results.validPanelCount, 0);
  assert.equal(results.totalPanelCount, 12);
  assert.equal(results.averagePressurePa, null);
  const selected = selectedCalculation(results, 'front-panel-1');
  close(selected.trialForceN, -9.377846200289834e-6);
  assert.equal(selected.panel.forceN, null);
  assert.match(calculationStatus(results, geometry).detail, /负法向力/);
  assert.equal(formatNumber(null), '无有效值');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(Number.NaN), '无有效值');
});

test('valid teaching example obeys all serial moment balances and area-pressure relationships', () => {
  const { results } = teachingExample();
  assert.equal(results.isComplete, true);
  close(results.averagePressurePa, 22.314451444479264);
  close(results.totalContactForceN, 12.0498037800188e-6);
  for (const matrix of Object.values(results.mechanics.leverArmMatricesBySide)) {
    matrix.valuesM.forEach((row, index) => close(row.reduce((sum, arm, col) => sum + arm * matrix.rawForcesN[col], 0), matrix.outputMomentsNm[index]));
  }
  for (const panel of results.panelResults) close(panel.pressurePa * panel.contactAreaM2, panel.forceN);
});

test('180 degree comparison is a parameter conversion, not a hardcoded angle or force calibration', () => {
  const curvature = Math.PI / 30e-6;
  const inputStrain = 0.001 * curvature / section(defaultSnapshot).freeCurvaturePerM;
  close(inputStrain * 100, 1.4108078120287488);
  close(calculate({}, { pdEigenstrain: inputStrain }).results.mechanics.hinges[0].freeThetaRad, Math.PI);
});

test('CSV distinguishes valid pressure from signed trial force and JSON retains the scientific snapshot', () => {
  const csv = resultsCsv(defaultSnapshot.results);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 13);
  const first = lines[1].split(',');
  assert.equal(first[14], '');
  assert.equal(first[16], '');
  assert.ok(Number(first[17]) < 0);
  const validCsv = resultsCsv(teachingExample().results).split('\r\n')[1].split(',');
  close(Number(validCsv[14]), 1.0198076436460208);
  close(Number(validCsv[16]), 22.662392081022688);
  const json = JSON.parse(serializeConfiguration({ geometryInputs: initialGeometry, mechanicsInputs: initialMechanics,
    ...defaultSnapshot, visualization: { wrapProgress: 1, visualizationMode: 'geometry', pressureScaleMode: 'auto', showForceArrows: true, selectedPanelId: 'front-panel-1' } }));
  close(json.calculationSnapshot.mechanics.sectionsByHingeId['front-hinge-1'].freeCurvaturePerM, section(defaultSnapshot).freeCurvaturePerM);
});

test('entry module links local files and the core no longer mounts a competing UI', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(index, /src="\.\/assets\/simulator-ui\.js"/);
  const core = readFileSync(new URL('../assets/simulator-core-v0.2.js', import.meta.url), 'utf8');
  assert.doesNotMatch(core, /uw\.createRoot\(document\.getElementById/);
});
