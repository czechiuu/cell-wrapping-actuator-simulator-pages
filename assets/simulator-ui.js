import {
  React, ReactDOM, useSimulatorStore as useStore, GeometryField, PanelCountField,
  NumberField, StripCountField, HingeOverrideControls, LegacyMechanicsControls,
  SimulationScene, WrapSlider, PressureColorBar, pressureScale,
  serializeConfiguration, downloadFile, calculateSnapshot, initialGeometry, initialMechanics,
} from './simulator-core-v0.2.js';
import {
  sideNames, finite, formatNumber as fmt, panelLabel, selectedCalculation,
  calculationStatus, resultsCsv,
} from './result-view.js';

const h = React.createElement;
const toMicrometres = value => value * 1e6;
const fromMicrometres = value => value * 1e-6;
const toNanometres = value => value * 1e9;
const fromNanometres = value => value * 1e-9;
const toGPa = value => value / 1e9;
const fromGPa = value => value * 1e9;
const toPercent = value => value * 100;
const fromPercent = value => value / 100;
const contactNames = { contact: '接触', clearance: '间隙', penetration: '穿透' };
const stateNames = { valid: '有效', 'invalid-input': '输入无效', 'invalid-geometry': '几何无效', 'invalid-solve': '平衡不成立' };

function Section({ title, children, ...props }) {
  return h('section', props, h('h3', null, title), children);
}
function Note({ children, className = '' }) {
  return h('p', { className: `explanation ${className}` }, children);
}
function GeometryControls({ title, fields, children }) {
  return h(Section, { title }, fields.map(([id, label, rule]) =>
    h(GeometryField, { key: id, id, label, ...(rule ? { rule } : {}) })), children);
}
function MechanicsField({ field, label, unit, toDisplayValue, fromDisplayValue, rule = 'positive' }) {
  const value = useStore(state => state.mechanicsInputs[field]);
  const change = useStore(state => state.setMechanicsInput);
  return h(NumberField, { id: `active-${field}`, label, value, unit, toDisplayValue, fromDisplayValue,
    rule, onChange: next => change(field, next) });
}
function OverrideList() {
  const state = useStore();
  const [expanded, setExpanded] = React.useState(false);
  const overrides = state.mechanicsInputs.hingeOverrides ?? [];
  const hinges = state.scientificSnapshot.geometry.fourSideWrapper.segments.filter(s => s.kind === 'hinge');
  return h('details', { className: 'active-overrides', onToggle: event => setExpanded(event.currentTarget.open) },
    h('summary', null, `逐节设置（${overrides.length} 项独立设置）`),
    h(Note, null, overrides.length ? '已独立设置的值不会随上方默认值改变。展开对应铰链可查看或清除。' : '四侧所有铰链共用上方参数；需要不同输出时，在这里逐节设置。'),
    h('button', { type: 'button', disabled: !overrides.length, onClick: state.clearAllHingeOverrides }, '清除全部独立设置'),
    expanded && hinges.map(hinge => h(HingeOverrideControls, { key: hinge.id, hingeId: hinge.id })));
}
function ActiveHingeControls() {
  const state = useStore();
  const g = state.geometryInputs;
  const m = state.mechanicsInputs;
  const metalWidth = m.singleStripWidthM * m.numberOfParallelActuators;
  const isLegacy = m.modelId === 'placeholder-mechanics';
  return h(Section, { title: '主动铰链 / Pd–Au 执行器', className: 'active-hinge-controls' },
    h(Note, null, '当前模型中，每个连接面板的铰链就是一个主动弯曲段，由多条 Pd–Au 金属条并联驱动。'),
    h(Note, { className: 'input-provenance' }, '初始材料与应变值来自教学算例，未校准到实际器件。自由转角由这些输入计算，不是器件的最大弯曲角。'),
    h(GeometryField, { id: 'hingeLengthM', label: '弯曲段长度 L（沿串联方向）' }),
    h(Note, null, 'L 只计裸露、能弯曲的双层金属段，不包含刚性面板。这里与执行器有效弯曲长度共用一个输入。'),
    h(Note, null, `每侧 ${g.panelsPerSide} 个主动铰链，四侧共 ${4 * g.panelsPerSide} 个；数量随面板数变化。此版本没有独立的 split hinge 分节参数。`),
    isLegacy ? h(LegacyMechanicsControls) : h(React.Fragment, null,
      h('h4', null, '参与力矩计算的金属尺寸'),
      h(MechanicsField, { field: 'singleStripWidthM', label: '单条金属宽度 w', unit: 'µm', toDisplayValue: toMicrometres, fromDisplayValue: fromMicrometres }),
      h(StripCountField, { id: 'active-parallel-count', label: '每个铰链的并联条数 n（1–20）', value: m.numberOfParallelActuators,
        onChange: value => state.setMechanicsInput('numberOfParallelActuators', value) }),
      h(MechanicsField, { field: 'pdThicknessM', label: 'Pd 层厚度（下层）', unit: 'nm', toDisplayValue: toNanometres, fromDisplayValue: fromNanometres }),
      h(MechanicsField, { field: 'auThicknessM', label: 'Au 层厚度（上层）', unit: 'nm', toDisplayValue: toNanometres, fromDisplayValue: fromNanometres }),
      h('div', { className: 'derived-values' },
        h('span', null, '默认有效金属总宽 n × w'), h('strong', { 'data-testid': 'metal-width' }, `${fmt(metalWidth, 1e6)} µm`),
        h('span', null, '默认金属总厚 tPd + tAu'), h('strong', { 'data-testid': 'metal-thickness' }, `${fmt(m.pdThicknessM + m.auThicknessM, 1e9)} nm`)),
      h('h4', null, '材料与驱动'),
      h(MechanicsField, { field: 'pdYoungModulusPa', label: 'Pd 杨氏模量', unit: 'GPa', toDisplayValue: toGPa, fromDisplayValue: fromGPa }),
      h(MechanicsField, { field: 'auYoungModulusPa', label: 'Au 杨氏模量', unit: 'GPa', toDisplayValue: toGPa, fromDisplayValue: fromGPa }),
      h('label', { className: 'field', htmlFor: 'active-drive-mode' }, h('span', null, '驱动输入'),
        h('select', { id: 'active-drive-mode', value: m.driveMode, onChange: event => state.setMechanicsDriveMode(event.target.value) },
          h('option', { value: 'eigenstrain' }, '从 Pd/Au 应变差计算'),
          h('option', { value: 'measured-free-curvature' }, '输入已测自由曲率'))),
      m.driveMode === 'eigenstrain' ? h(React.Fragment, null,
        h(MechanicsField, { field: 'pdEigenstrain', label: 'Pd 自由伸长应变 εPd*', unit: '%', toDisplayValue: toPercent, fromDisplayValue: fromPercent, rule: 'finite' }),
        h(MechanicsField, { field: 'auEigenstrain', label: 'Au 自由伸长应变 εAu*', unit: '%', toDisplayValue: toPercent, fromDisplayValue: fromPercent, rule: 'finite' }),
        h(Note, null, `应变差 Δε = ${fmt(m.pdEigenstrain - m.auEigenstrain, 100)}%。正差值对应朝 Au 弯曲。`)
      ) : h(MechanicsField, { field: 'measuredFreeCurvaturePerM', label: '自由曲率 κ₀', unit: 'm⁻¹', rule: 'finite' }),
      h(Note, null, '长度决定 κc = θ / L；金属条宽度、条数、Pd/Au 层厚与模量共同决定 EI。各面板力由整条串联结构的力矩平衡求出。'),
      h(OverrideList)),
    h('details', { className: 'appearance-settings' },
      h('summary', null, '三维外形与安装设置'),
      h(GeometryField, { id: 'hingeWidthM', label: '铰链外形宽度（不作为金属总宽）' }),
      h(GeometryField, { id: 'hingeThicknessM', label: '铰链示意厚度（不计入 EI）' }),
      h(Note, null, '外形宽度和示意厚度用于三维几何显示。计算 EI 使用上方金属参数；此模型没有额外计入 SU8 等被动铰链层的抗弯刚度。'),
      metalWidth > g.hingeWidthM && h(Note, { className: 'inline-warning' }, '金属总宽已超过示意外形宽度，请检查条带排布；间隙需要额外预留。'),
      !isLegacy && h(MechanicsField, { field: 'metalReferenceOffsetM', label: '金属安装偏移（朝 Au 为正）', unit: 'µm', toDisplayValue: toMicrometres, fromDisplayValue: fromMicrometres, rule: 'finite' })),
    !isLegacy && h('details', { className: 'legacy-settings' }, h('summary', null, '旧版模型对照'),
      h(Note, null, '占位模型只用于兼容旧配置，结果不代表 Pd–Au 双层解析计算。'),
      h('button', { type: 'button', onClick: () => state.setMechanicsModel('placeholder-mechanics') }, '切换至旧版占位模型')));
}
function Parameters() {
  return h('aside', { className: 'side-panel parameter-panel', 'aria-label': '结构与驱动参数' },
    h('h2', null, '结构与驱动参数'),
    h(GeometryControls, { title: '细胞', fields: [['cellDiameterM', '直径']] }),
    h(GeometryControls, { title: '底部固定面板', fields: [['bottomPanelLengthM', '长度'], ['bottomPanelWidthM', '宽度'], ['bottomPanelThicknessM', '厚度']] }),
    h(GeometryControls, { title: '包裹面板', fields: [['panelLengthM', '长度'], ['panelWidthM', '宽度'], ['panelThicknessM', '厚度']] },
      h(PanelCountField), h(Note, null, '每侧面板数也决定每侧主动铰链数；每个面板前接一个铰链。')),
    h(ActiveHingeControls),
    h(GeometryControls, { title: '几何接触设置', fields: [['cellClearanceM', '细胞间隙', 'finite'], ['contactToleranceM', '接触容差', 'non-negative']] }));
}
function ValueRow({ label, value, unit = '', scale = 1, testId, note }) {
  return h('tr', null, h('th', { scope: 'row' }, label),
    h('td', { 'data-testid': testId }, fmt(value, scale), finite(value) && unit ? ` ${unit}` : '', note && h('small', null, note)));
}
function SelectedResults({ results, selectedId, select }) {
  const { panel, hinge, section, trialForceN } = selectedCalculation(results, selectedId);
  if (!panel) return null;
  return h(Section, { title: '逐节计算值', className: 'selected-calculation' },
    h('label', { className: 'field', htmlFor: 'result-panel-select' }, h('span', null, '选择面板与它前面的铰链'),
      h('select', { id: 'result-panel-select', value: panel.panelId, onChange: event => select(event.target.value) },
        results.panelResults.map(item => h('option', { key: item.panelId, value: item.panelId }, panelLabel(item))))),
    h(Note, null, `${panel.associatedHingeId ?? '旧版占位模型'} · ${stateNames[panel.status]} · 几何状态：${contactNames[panel.contactState]}`),
    h('table', { className: 'calculation-values', 'aria-label': '所选铰链与面板计算值' }, h('tbody', null,
      h(ValueRow, { label: '自由曲率 κ₀', value: section?.freeCurvaturePerM, unit: 'm⁻¹', testId: 'free-curvature' }),
      h(ValueRow, { label: '自由转角 θ₀ = κ₀L', value: hinge?.freeThetaRad, scale: 180 / Math.PI, unit: '°', testId: 'free-angle' }),
      h(ValueRow, { label: '几何指定转角 θ', value: hinge?.thetaRad, scale: 180 / Math.PI, unit: '°', testId: 'actual-angle' }),
      h(ValueRow, { label: '平均受限曲率 κc = θ/L', value: hinge?.constrainedCurvaturePerM, unit: 'm⁻¹' }),
      h(ValueRow, { label: '弯曲刚度 EI', value: section?.bendingStiffnessNm2, unit: 'N·m²', testId: 'bending-stiffness' }),
      h(ValueRow, { label: '平均输出力矩 M', value: hinge?.outputMomentNm ?? panel.governingHingeMomentNm, scale: 1e9, unit: 'nN·m', testId: 'output-moment' }),
      h(ValueRow, { label: '中点近似力臂 r（带符号）', value: panel.associatedHingeLeverArmM, scale: 1e6, unit: 'µm' }),
      h(ValueRow, { label: '面板接触力 F', value: panel.status === 'valid' ? panel.forceN : null, scale: 1e6, unit: 'µN', testId: 'contact-force' }),
      h(ValueRow, { label: '完整面板面积', value: panel.contactAreaM2, scale: 1e12, unit: 'µm²' }),
      h(ValueRow, { label: '名义压强 p', value: panel.status === 'valid' ? panel.pressurePa : null, unit: 'Pa', testId: 'panel-pressure' }))),
    h(Note, { className: 'formula-note' }, 'M = EI·(κ₀ − κc)。一个铰链要平衡它后面所有面板的力矩：Mⱼ = Σ Fᵢ·rⱼᵢ；依次求出 F 后，再用 p = F / 面积。此处把有限长铰链的平均力臂近似为中点力臂。'),
    hinge && finite(hinge.freeThetaRad) && finite(hinge.thetaRad) && hinge.thetaRad > hinge.freeThetaRad && h(Note, { className: 'inline-warning' },
      `此铰链自由转角 ${fmt(hinge.freeThetaRad, 180 / Math.PI)}° 小于所需 ${fmt(hinge.thetaRad, 180 / Math.PI)}°，输出力矩为负，驱动不足以单独维持该转角。`),
    panel.status !== 'valid' && finite(trialForceN) && h(Note, { className: 'trial-note' },
      `此面板平衡试算力：${fmt(trialForceN, 1e6)} µN（诊断值）。所在侧未通过完整的非负接触力检查，因此不计入有效载荷与压强。`),
    h('details', null, h('summary', null, '截面与力矩分解'),
      h(Note, null, '中性轴 zN 从 Au 顶面起算，向 Pd 为正。'),
      h('table', { className: 'calculation-values' }, h('tbody', null,
        h(ValueRow, { label: '中性轴 zN', value: section?.zNeutralM, scale: 1e9, unit: 'nm' }),
        h(ValueRow, { label: '应变差 Δε', value: section?.deltaEigenstrain, scale: 100, unit: '%' }),
        h(ValueRow, { label: '驱动弯矩 EI·κ₀', value: hinge?.actuationMomentNm, scale: 1e9, unit: 'nN·m' }),
        h(ValueRow, { label: '受限弯曲项 EI·κc', value: hinge?.passiveMomentNm, scale: 1e9, unit: 'nN·m' }),
        h(ValueRow, { label: '单位转角所需力矩 EI/L', value: hinge?.rotationalStiffnessNmPerRad, unit: 'N·m/rad' }))),
      section?.resolvedInput?.driveMode === 'measured-free-curvature' && h(Note, null, '已测自由曲率模式无法从该输入反推出 Pd/Au 应变差。')),
    hinge && section && h(FreeAngleCheck, { hinge, section }));
}
function FreeAngleCheck({ hinge, section }) {
  const curvatureForHalfTurn = hinge.hingeLengthM > 0 ? Math.PI / hinge.hingeLengthM : null;
  const equivalentStrain = finite(curvatureForHalfTurn) && finite(section.deltaEigenstrain)
    && finite(section.freeCurvaturePerM) && section.freeCurvaturePerM !== 0
    ? section.deltaEigenstrain * curvatureForHalfTurn / section.freeCurvaturePerM : null;
  return h('details', { className: 'free-angle-check' }, h('summary', null, '自由转角与 180° 对照'),
    h(Note, null, '均匀自由曲率时 θ₀ = κ₀L。并联条数增大会同比增大 EI 与主动弯矩，但不会增大自由曲率或自由转角。'),
    h(Note, null, `当前有效长度 ${fmt(hinge.hingeLengthM, 1e6)} µm；若这一长度自由转过 180°，对应曲率为 ${fmt(curvatureForHalfTurn)} m⁻¹。`),
    finite(equivalentStrain) && h(Note, null, `在当前层厚和模量下，线性模型对应的等效应变差约 ${fmt(equivalentStrain, 100)}%。这是对照换算，不是对实际驱动应变的测量，也不会改动输入。`));
}
function AllResults({ results, selectedId, select }) {
  return h('details', { className: 'all-results', open: true }, h('summary', null, '全部面板与铰链数值'),
    h(Note, null, '表格可左右滚动。点击面板编号可切换上方明细；负的平衡试算值仅作诊断。'),
    h('div', { className: 'table-scroll', tabIndex: 0, role: 'region', 'aria-label': '全部结果表，可横向滚动' },
      h('table', null,
        h('thead', null, h('tr', null, ['面板', 'θ / °', 'θ₀ / °', 'M / nN·m', 'F / µN', 'p / Pa', '平衡试算 / µN', '计算状态'].map(title => h('th', { key: title, scope: 'col' }, title)))),
        h('tbody', null, results.panelResults.map(panel => {
          const { hinge, trialForceN } = selectedCalculation(results, panel.panelId);
          return h('tr', { key: panel.panelId, className: panel.panelId === selectedId ? 'selected-row' : '' },
            h('th', { scope: 'row' }, h('button', { type: 'button', onClick: () => select(panel.panelId), 'aria-pressed': selectedId === panel.panelId }, panelLabel(panel))),
            h('td', null, fmt(hinge?.thetaRad, 180 / Math.PI)), h('td', null, fmt(hinge?.freeThetaRad, 180 / Math.PI)),
            h('td', null, fmt(hinge?.outputMomentNm ?? panel.governingHingeMomentNm, 1e9)),
            h('td', null, fmt(panel.status === 'valid' ? panel.forceN : null, 1e6)),
            h('td', null, fmt(panel.status === 'valid' ? panel.pressurePa : null)),
            h('td', null, fmt(trialForceN, 1e6)), h('td', null, stateNames[panel.status]));
        })))));
}
function ResultControls({ state, results }) {
  return h('div', { className: 'result-view-controls' },
    h('label', { className: 'field', htmlFor: 'visualizationMode' }, h('span', null, '三维显示'),
      h('select', { id: 'visualizationMode', value: state.visualizationMode, onChange: event => state.setVisualizationMode(event.target.value) },
        h('option', { value: 'geometry' }, '几何视图'), h('option', { value: 'pressure' }, '压强热力图'))),
    h('label', { className: 'toggle-field' }, h('input', { type: 'checkbox', checked: state.showForceArrows, onChange: event => state.setShowForceArrows(event.target.checked) }), '显示力箭头'),
    state.visualizationMode === 'pressure' && h(PressureColorBar, { scale: pressureScale(results.panelResults), validCount: results.validPanelCount, totalCount: results.totalPanelCount }));
}
function Exports({ state }) {
  const { geometry, results } = state.scientificSnapshot;
  return h('div', { className: 'export-actions' },
    h('button', { type: 'button', onClick: () => downloadFile('cell-wrapping-results.csv', resultsCsv(results), 'text/csv;charset=utf-8') }, '导出数值 CSV'),
    h('button', { type: 'button', onClick: () => downloadFile('cell-wrapping-configuration.json', serializeConfiguration({
      geometryInputs: state.geometryInputs, mechanicsInputs: state.mechanicsInputs, geometry, results,
      visualization: { wrapProgress: state.wrapProgress, visualizationMode: state.visualizationMode,
        showForceArrows: state.showForceArrows, pressureScaleMode: state.pressureScaleMode, selectedPanelId: state.selectedPanelId },
    }), 'application/json') }, '导出完整配置 JSON'));
}
function Results() {
  const state = useStore();
  const { results, geometry } = state.scientificSnapshot;
  const selected = selectedCalculation(results, state.selectedPanelId).panel;
  React.useEffect(() => {
    if (state.selectedPanelId !== selected?.panelId) state.setSelectedPanelId(selected?.panelId);
  }, [state.selectedPanelId, selected?.panelId, state.setSelectedPanelId]);
  const status = calculationStatus(results, geometry);
  const isLegacy = state.mechanicsInputs.modelId === 'placeholder-mechanics';
  const loadExample = () => { state.loadTeachingMechanicsExample(); state.setSelectedPanelId('front-panel-1'); };
  const restore = () => useStore.setState({ geometryInputs: initialGeometry, mechanicsInputs: initialMechanics,
    scientificSnapshot: calculateSnapshot(initialGeometry, initialMechanics), selectedPanelId: 'front-panel-1' });
  return h('aside', { className: 'side-panel results-panel', 'aria-label': '计算数值' },
    h('h2', null, '计算数值'),
    h(Note, null, isLegacy ? '旧版占位模型 · 结果仅供对照' : 'Pd–Au 双层解析模型 · 给定姿态下的近似名义载荷'),
    h('div', { className: `calculation-status ${status.kind}`, role: 'status' }, h('strong', null, status.title), h('p', null, status.detail)),
    h('div', { className: 'result-metrics' },
      h('div', null, h('span', null, '名义平均压强'), h('strong', { 'data-testid': 'average-pressure' }, fmt(results.averagePressurePa)), h('small', null, 'Pa')),
      h('div', null, h('span', null, '各面板压力大小之和'), h('strong', { 'data-testid': 'total-force' }, fmt(results.totalContactForceN, 1e6)), h('small', null, 'µN（标量相加）'))),
    h('details', { className: 'example-settings' }, h('summary', null, '查看有数值的教学示例 / 恢复初始参数'),
      h(Note, null, '教学示例会恢复默认几何，并为三节铰链设置不同自由曲率；它未经实验校准，不代表当前器件。可先导出配置保存当前输入。'),
      h('div', { className: 'inline-actions' }, h('button', { type: 'button', onClick: loadExample }, '载入教学示例（会替换当前参数）'),
        h('button', { type: 'button', onClick: restore }, '恢复初始参数'))),
    h(SelectedResults, { results, selectedId: selected?.panelId, select: state.setSelectedPanelId }),
    h(ResultControls, { state, results }),
    h(AllResults, { results, selectedId: selected?.panelId, select: state.setSelectedPanelId }),
    h(Exports, { state }),
    h('details', { className: 'diagnostics' }, h('summary', null, '几何与计算诊断'),
      h(Note, null, `几何状态：${Object.entries(contactNames).map(([key, label]) => `${label} ${results.panelResults.filter(p => p.contactState === key).length}`).join('；')}。`),
      [...new Set([...geometry.warnings, ...results.warnings])].map(message => h(Note, { key: message }, message))),
    h('details', { className: 'model-assumptions' }, h('summary', null, '理论模型计算到了哪一步'),
      h(Note, null, '截面计算采用两层牢固结合、小应变、线弹性薄梁；逐层积分得到中性轴、EI 和自由曲率。允许较大整体转动，但没有计入塑性、脱层或电化学动力学。'),
      h(Note, null, '几何程序先指定最终面板姿态，再求该姿态下的力矩平衡；没有把细胞刚度、接触压缩和脱离条件一起求解。几何“间隙”或“穿透”说明指定姿态还没有建立真实接触。'),
      h(Note, null, '有限长铰链本应使用沿长度平均的力臂。本版将其近似到示意铰链中点，且未重建铰链受载曲线。长铰链、大转角或精确压强预测需要进一步求解弯曲形状与接触。')),
    h(Note, null, '所有力学值对应最终包裹姿态。下方滑块只改变动画显示，不重算中途受力。'));
}
function App() {
  return h('div', { className: 'app-shell simulator-ui' },
    h('header', null, h('h1', null, '细胞包裹执行器仿真器'), h('p', null, '主动铰链参数整合 · 实时显示曲率、力矩、接触力与压强')),
    h('div', { className: 'workspace' }, h(Parameters), h(SimulationScene), h(Results)), h(WrapSlider));
}
ReactDOM.createRoot(document.getElementById('root')).render(h(React.StrictMode, null, h(App)));
