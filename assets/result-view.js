// Presentation helpers only. Keep signed diagnostic forces separate from valid contact loads.
export const sideNames = { front: '前侧', right: '右侧', back: '后侧', left: '左侧' };
export const degrees = value => value * 180 / Math.PI;
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export function formatNumber(value, scale = 1) {
  if (!finite(value) || !finite(value * scale)) return '无有效值';
  const scaled = value * scale;
  if (scaled === 0) return '0';
  if (Math.abs(scaled) < 0.001 || Math.abs(scaled) >= 1e6) return scaled.toExponential(3);
  return Number(scaled.toPrecision(6)).toLocaleString('zh-CN', { maximumFractionDigits: 8 });
}
export function panelLabel(panel) {
  return `${sideNames[panel.side]} · 面板 ${panel.index}`;
}
export function selectedCalculation(results, selectedId) {
  const panel = results.panelResults.find(p => p.panelId === selectedId) ?? results.panelResults[0];
  if (!panel) return {};
  const hinge = results.mechanics.hinges.find(h => h.hingeId === panel.associatedHingeId);
  const section = hinge ? results.mechanics.sectionsByHingeId[hinge.hingeId] : undefined;
  const matrix = results.mechanics.leverArmMatricesBySide[panel.side];
  const index = matrix?.panelIds.indexOf(panel.panelId) ?? -1;
  const trialForceN = index >= 0 ? matrix.rawForcesN[index] : null;
  return { panel, hinge, section, matrix, trialForceN };
}
export function calculationStatus(results, geometry) {
  if (!results.totalPanelCount) return {
    kind: 'error', title: '几何无法建立，暂无面板结果',
    detail: geometry.warnings.join(' ') || '请检查细胞、底板和铰链尺寸。',
  };
  const negative = Object.values(results.mechanics.leverArmMatricesBySide).flatMap(matrix =>
    matrix.rawForcesN.map((force, index) => ({ force, panelId: matrix.panelIds[index] }))
  ).find(item => finite(item.force) && item.force < 0);
  if (!results.isComplete && negative) return {
    kind: 'error', title: '已完成力矩计算；当前无完整有效压强',
    detail: `平衡试算得到负法向力（${negative.panelId}：${formatNumber(negative.force, 1e6)} µN）。这表示维持指定姿态需要拉住细胞，与“只压、不黏附”的假设不相容；不能把它当作压强。下方仍显示已算出的曲率、转角和力矩。`,
  };
  if (!results.isComplete) return {
    kind: 'error', title: `有效面板 ${results.validPanelCount}/${results.totalPanelCount}，总量暂不可用`,
    detail: results.warnings[0] || '请查看下方计算诊断。',
  };
  return {
    kind: 'success', title: `已得到 ${results.validPanelCount}/${results.totalPanelCount} 个面板的名义载荷`,
    detail: '压强 = 有效接触力 ÷ 完整面板面积。它是给定最终姿态下的理论值；请结合几何接触状态判断是否真正贴合。',
  };
}
const csvCell = value => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
export function resultsCsv(results) {
  const columns = ['panelId', 'status', 'geometryContactState', 'hingeId', 'hingeLength_um',
    'effectiveMetalWidth_um', 'metalThickness_nm', 'freeCurvature_per_m', 'constrainedCurvature_per_m',
    'actualAngle_deg', 'freeAngle_deg', 'EI_N_m2', 'outputMoment_nN_m', 'associatedLeverArm_um',
    'validContactForce_uN', 'nominalArea_um2', 'validPressure_Pa', 'diagnosticTrialForce_uN', 'diagnostic'];
  const scaled = (value, scale) => finite(value) ? value * scale : null;
  const rows = results.panelResults.map(p => {
    const { hinge, section, trialForceN } = selectedCalculation(results, p.panelId);
    const input = section?.resolvedInput;
    const width = input ? input.singleStripWidthM * input.numberOfParallelActuators : null;
    const thickness = input ? input.pdThicknessM + input.auThicknessM : null;
    return [p.panelId, p.status, p.contactState, hinge?.hingeId, scaled(hinge?.hingeLengthM, 1e6),
      scaled(width, 1e6), scaled(thickness, 1e9), section?.freeCurvaturePerM, hinge?.constrainedCurvaturePerM,
      scaled(hinge?.thetaRad, 180 / Math.PI), scaled(hinge?.freeThetaRad, 180 / Math.PI), section?.bendingStiffnessNm2,
      scaled(hinge?.outputMomentNm, 1e9), scaled(p.associatedHingeLeverArmM, 1e6),
      p.status === 'valid' ? scaled(p.forceN, 1e6) : null, scaled(p.contactAreaM2, 1e12),
      p.status === 'valid' ? p.pressurePa : null, scaled(trialForceN, 1e6),
      [...new Set(p.issues.map(issue => issue.message))].join('；')];
  });
  return '\uFEFF' + [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
