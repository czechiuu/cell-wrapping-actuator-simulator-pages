# Cell Wrapping Actuator Simulator · v0.7

[打开仿真器](https://czechiuu.github.io/cell-wrapping-actuator-simulator-pages/?v=0.7)

此仓库仅发布静态构建产物；[源码与测试](https://github.com/czechiuu/cell-wrapping-actuator-simulator)独立保存。

等压设计固定铰链有效长度、单条金属宽度、可用带宽以及材料和驱动，在明确范围内联合搜索面板、底板尺寸和各处整数并联条数。每块面板独立检查目标容差，默认±5%：300 Pa对应285–315 Pa。候选应用保留精确整数数量，显示、正向力学和导出使用同一套规定几何；输入更改后旧候选失效。独立 Worker 运行搜索，未达标的近似方案不能冒充合格方案。

有限面板与底板在展开、包裹终态接受实体碰撞检查；旧构建文件继续保留，以避免已打开页面缺少资源。端态检查不证明全过程无碰撞。模型计算规定姿态下的条件反力，不证明自然平衡、稳定性、真实接触压力或制造可行性，材料和接触标定仍需实验确认。

[等压设计说明](docs/equal-pressure-design.md) · [v0.7 验证记录](docs/validation-v0.7.md) · [固定铰链几何设计](docs/geometry-first-design.md) · [逆向版图设计说明](docs/inverse-design.md) · [模型适用范围](docs/model-audit.md)

源码提交：[917c536fc8612db07127807db4f816e97f38bfbd](https://github.com/czechiuu/cell-wrapping-actuator-simulator/commit/917c536fc8612db07127807db4f816e97f38bfbd)。35 个测试文件、284 项测试通过，TypeScript 与 Vite 生产构建通过；[GitHub CI](https://github.com/czechiuu/cell-wrapping-actuator-simulator/actions/runs/38740246642) 对此精确提交验证成功。生产资源包含独立搜索 Worker。实际网页与 GPU 三维视觉需要另外核验，不能以 CI 成功替代。
