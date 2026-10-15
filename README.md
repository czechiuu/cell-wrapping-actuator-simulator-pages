# Cell Wrapping Actuator Simulator · v0.5

[打开仿真器](https://czechiuu.github.io/cell-wrapping-actuator-simulator-pages/)

此仓库仅发布静态构建产物；[源码与测试](https://github.com/czechiuu/cell-wrapping-actuator-simulator)独立保存。

新增独立“逆向设计”页面：输入每板目标名义压强、面板尺寸、铰链参数及版图限制，反推逐位置并联条数，并复查整数配置后的耦合载荷。包含目标下限模式、几何接触候选与独立 CSV/JSON 导出。结构设计结果明确说明无效压强的接触、平衡或参数原因。

模型计算规定姿态下的条件反力。几何候选不代表自然受力平衡；目标值不代表已达到的压强。材料和接触标定仍需实验确认。

[逆向版图设计说明](docs/inverse-design.md) · [v0.5 验证记录](docs/validation-v0.5.md) · [模型适用范围](docs/model-audit.md)

源码提交：[ab0fcdb9661557c1e705a9fc450590cf9dd128c0](https://github.com/czechiuu/cell-wrapping-actuator-simulator/commit/ab0fcdb9661557c1e705a9fc450590cf9dd128c0)。209 项本地测试通过，TypeScript 与 Vite 生产构建通过。线上部署与浏览器验证另行核验。
