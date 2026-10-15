# Cell Wrapping Actuator Simulator · v0.4

[打开仿真器](https://czechiuu.github.io/cell-wrapping-actuator-simulator-pages/)

仅发布静态构建产物，源码保存在原源码仓库。

结构设计与驱动标定分开；保留历史暂定记录及自定义接口。模型使用有限长常曲率铰链、一致虚功 Jacobian 和整面接触检查。规定姿态不相容时保留力矩诊断，不生成虚假压强。

[计算逻辑与适用范围](docs/model-audit.md) · [数值验证记录](docs/validation-v0.4.md)

源码提交：0be9e568d7ec9ca6869b7d65eb229eb806b03956。146项本地测试通过，生产构建通过。真实材料与接触标定仍需实验确认。
