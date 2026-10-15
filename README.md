# Cell Wrapping Actuator Simulator · v0.4

[打开仿真器](https://czechiuu.github.io/cell-wrapping-actuator-simulator-pages/)

仅发布静态构建产物，源码保存在原源码仓库。

结构设计与驱动标定分开；保留历史暂定记录及自定义接口。模型使用有限长常曲率铰链、一致虚功 Jacobian 和整面接触检查。规定姿态不相容时保留力矩诊断，不生成虚假压强。

[计算逻辑与适用范围](docs/model-audit.md) · [数值验证记录](docs/validation-v0.4.md)

源码提交：2613de08e3eddf33fbdb19c23522cf56da7bd48b。147项本地测试通过，生产构建通过。真实材料与接触标定仍需实验确认。
