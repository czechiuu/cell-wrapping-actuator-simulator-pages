# Cell Wrapping Actuator Simulator · v0.6

[打开仿真器](https://czechiuu.github.io/cell-wrapping-actuator-simulator-pages/)

此仓库仅发布静态构建产物；[源码与测试](https://github.com/czechiuu/cell-wrapping-actuator-simulator)独立保存。

固定已输入的铰链有效长度、单条金属宽度与可用带宽，在明确范围内调整面板、底板长宽。搜索接触转角后重新计算面积载荷、整数并联数量及相邻面板和根部底板的支撑宽度。应用到正向页面后，三维显示、力学计算和导出共用同一套规定几何；修改尺寸或设计目标会使旧方案失效。

模型计算规定姿态下的条件反力。几何候选不代表自然受力平衡；目标值不代表已达到的压强。材料和接触标定仍需实验确认。

[固定铰链几何设计](docs/geometry-first-design.md) · [v0.6 验证记录](docs/validation-v0.6.md) · [逆向版图设计说明](docs/inverse-design.md) · [模型适用范围](docs/model-audit.md)

源码提交：[16e20bf3c87528d86966f8d28151552eb271f8ff](https://github.com/czechiuu/cell-wrapping-actuator-simulator/commit/16e20bf3c87528d86966f8d28151552eb271f8ff)。31 个测试文件、238 项测试通过，TypeScript 与 Vite 生产构建通过；[GitHub CI](https://github.com/czechiuu/cell-wrapping-actuator-simulator/actions/runs/38711772437) 对此提交验证成功。真实 GPU 三维视觉仍需 WebGL2 设备核验。
