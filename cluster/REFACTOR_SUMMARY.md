# 组件拆分重构总结

## 重构目标
将大型页面组件拆分为更小、更易维护的模块，保持现有功能不变。

## 文件变化概览

### 1. 共享工具函数 (src/utils/)

#### exportUtils.js - 数据导出工具
- `escapeCsvValue()` - CSV 值转义
- `buildCsv()` - 构建 CSV 内容
- `buildHeatmapCsv()` - 构建热图 CSV
- `downloadCsv()` - 下载 CSV 文件
- `downloadHeatmapCsv()` - 下载热图 CSV
- `remapScatterRowsForExport()` - 散点图数据导出映射
- `formatTableValue()` - 格式化表格数值
- `generateTimestampFilename()` - 生成带时间戳的文件名
- `sanitizeFilename()` - 清理文件名

#### dataHelpers.js - 数据辅助函数
- `normalizeSourceValue()` - 归一化来源值
- `normalizeGroupValue()` - 归一化分组值
- `clampValue()` - 数值限制
- `buildScatterTableColumns()` - 构建散点表列
- `getNumericColumnOptions()` - 获取数值列选项
- `getColorFieldOptions()` - 获取颜色字段选项
- `calculateValueRange()` - 计算数值范围
- `filterScatterPoints()` - 过滤散点数据
- `getGroupOptions()` - 获取分组选项
- `getSourceOptions()` - 获取来源选项

### 2. 自定义 Hooks (src/hooks/)

#### useScatterLayout.js
- 管理散点图页面布局
- 分析区域高度计算
- 散点图面板尺寸调整

#### useScatterSize.js
- 散点图尺寸管理
- 自定义尺寸设置
- 拖拽调整大小

#### useScatterPreview.js
- 预览图生成逻辑
- Plotly 图表渲染
- 批量预览处理

#### useScatterFilters.js
- 散点图筛选逻辑
- 来源筛选状态
- 聚类筛选状态
- 图例项计算

#### useHeatmapLayout.js
- 热图页面布局管理
- 热图容器尺寸
- 根字体大小监听

#### useScatterPanelLayout.js
- 热图页面散点图面板布局
- 高度自适应计算

#### useFileOperations.js
- 文件列表操作
- 文件获取、删除、下载、上传

#### useDataIntegration.js
- 数据整合逻辑
- CSV/FCS 文件验证
- 整合上传处理

### 3. 热图页面组件 (src/components/heatmap/)

| 组件 | 功能 |
|------|------|
| HeatmapTab.jsx | 热图展示与下载 |
| ScatterTab.jsx | 散点图展示与筛选 |
| ClusterTableTab.jsx | 聚类数据表 |
| ScatterTableTab.jsx | 散点数据表 |
| ScatterLegendPanel.jsx | 图例面板（颜色、大小、筛选） |
| PreviewGallery.jsx | 预览图库 |
| PreviewDialog.jsx | 预览图片弹窗 |
| index.js | 组件导出 |

### 4. 文件列表组件 (src/components/filelist/)

| 组件 | 功能 |
|------|------|
| FileCard.jsx | 单个文件卡片 |
| EmptyState.jsx | 空状态展示 |
| FileListHeader.jsx | 列表头部 |
| index.js | 组件导出 |

### 5. 更新后的页面文件

#### HeatmapPage.jsx
- 原始：~1,570 行
- 重构后：~280 行
- 使用拆分的 hooks 和组件
- 职责单一，逻辑清晰

#### FileListPage.jsx
- 原始：~412 行
- 重构后：~185 行
- 使用自定义 hooks 处理业务逻辑
- 组件化 UI 部分

## 代码行数对比

| 文件 | 重构前 | 重构后 | 减少 |
|------|--------|--------|------|
| HeatmapPage.jsx | ~1,570 | ~280 | -82% |
| FileListPage.jsx | ~412 | ~185 | -55% |
| ScatterPage.jsx | ~2,852 | 未完全拆分 | - |

## 构建验证
✅ 构建成功，无严重错误
- 2663 个模块转换成功
- 生成生产构建文件

## 设计原则

1. **单一职责原则**：每个组件/Hook 只负责一件事
2. **关注点分离**：UI、逻辑、数据分离
3. **可复用性**：工具函数和 Hooks 可在多处使用
4. **可测试性**：小模块更易于单元测试
5. **可维护性**：代码结构清晰，易于理解和修改

## 后续建议

1. **ScatterPage.jsx** 仍可进一步拆分（当前约 2,852 行）
2. 考虑添加组件单元测试
3. 可考虑使用 TypeScript 增强类型安全
