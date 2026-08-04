# 🚀 航天任务模拟器 (Aerospace Rocket Simulation)

基于 **Vue 3 + Vite + Cesium** 的三维航天发射全流程模拟系统，覆盖火箭点火起飞、级间分离、入轨及卫星部署等完整任务阶段。

## ✨ 功能特性

- **真实发射场景**：以酒泉发射中心（40.958°N, 100.290°E）为起点，基于真实经纬度构建三维地球场景
- **多阶段火箭模拟**：支持一级飞行、级间分离、二级入轨等完整发射流程
- **近景/远景天空盒**：根据相机高度自动切换远景星空与近景大气天空盒（白天/黄昏/夜晚）
- **实时轨道计算**：基于 `satellite.js` 进行 TLE 轨道传播，计算卫星位置与轨道路径
- **GPU 粒子尾焰**：自研 GPU 粒子系统实现火箭尾焰特效
- **动态场景设置**：支持大气散射、景深、雾效、动态阴影、HDR、抗锯齿等图形选项实时调节
- **背景音乐系统**：内置多首背景音乐，支持音量控制与切换
- **音效系统**：火箭点火、引擎轰鸣、爆炸等音效
- **HUD 面板**：可拖拽的飞行参数面板，实时显示高度、速度等遥测数据
- **雷达模型可视化**：地面雷达站与传感器棱锥可视化
- **时间轴回放**：支持任务时间轴拖拽回放

## 🛠 技术栈

| 技术 | 说明 |
|------|------|
| Vue 3 | 前端框架（Composition API + `<script setup>`） |
| Vite 5 | 构建工具 |
| Cesium | 三维地球引擎（WebGL） |
| satellite.js | SGP4 轨道计算库 |
| ECharts | 遥测数据图表 |
| Capacitor | 移动端适配 |

## 📦 项目结构

```
├── public/
│   ├── cesium/              # Cesium 构建产物（Build + skybox-onground.js）
│   ├── images/              # 天空盒贴图、星空图、UI 图标
│   ├── models/              # 3D 模型（火箭、发射塔、雷达 .glb）
│   ├── musics/              # 背景音乐
│   └── sounds/              # 音效文件
├── src/
│   ├── views/
│   │   ├── KspLaunchView.vue  # 主发射模拟视图
│   │   └── LaunchView.vue      # 简化发射视图
│   ├── components/            # UI 组件（HUD、时间轴、遥测图表）
│   ├── tools/                 # Cesium 自定义工具类
│   ├── GPUParticles.js        # GPU 粒子系统
│   ├── orbitCalculator.js     # 轨道计算引擎
│   └── rocketModelGLB.js      # 火箭模型朝向控制
├── .github/workflows/deploy.yml  # GitHub Pages 自动部署
└── vite.config.js
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🌐 在线访问

GitHub Pages 部署地址：[https://kangweitao1998-coder.github.io/-aerospace-rocket-simulation/](https://kangweitao1998-coder.github.io/-aerospace-rocket-simulation/)

## 🎮 使用说明

1. 页面加载完成后，点击 **「开始任务」** 进入发射场景
2. 火箭将自动执行点火、起飞、级间分离与入轨流程
3. 使用鼠标可旋转/缩放视角观察火箭飞行状态
4. 通过顶部工具栏可打开 **设置面板** 调节图形质量
5. 支持背景音乐切换与音量调节

## 📋 场景设置选项

| 选项 | 说明 |
|------|------|
| 大气效果 | 地表大气层与天空散射 |
| 景深 | 远距离场景焦外模糊 |
| 雾效 | 地平线及远景雾化 |
| 动态阴影 | 模型及地表实时阴影 |
| 抗锯齿 | 平滑模型和轨道边缘 |
| 高动态范围 | 提升明暗层次和光照细节 |
| 太阳光源 | 启用太阳方向光照 |

## 📄 License

MIT License

## 👤 作者

康伟涛 (kangweitao) · kangweitao1998@163.com

© 2024-2026 All Rights Reserved
