/**
 * 数据导出工具函数
 * 提供 CSV、热图 CSV 等导出功能
 */

/**
 * 转义 CSV 值
 * @param {*} value
 * @returns {string}
 */
export const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * 构建 CSV 内容
 * @param {Array} rows
 * @returns {string}
 */
export const buildCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => escapeCsvValue(row?.[key])).join(',')),
  ];
  return lines.join('\n');
};

/**
 * 构建热图 CSV
 * @param {Object} heatmap
 * @returns {string}
 */
export const buildHeatmapCsv = (heatmap) => {
  if (!heatmap || !Array.isArray(heatmap.values) || heatmap.values.length === 0) return '';
  const rows = heatmap.rows || [];
  const cols = heatmap.cols || [];
  const values = heatmap.values || [];
  const headers = ['row', ...cols];
  const lines = [headers.map(escapeCsvValue).join(',')];
  values.forEach((rowValues, index) => {
    const label = rows[index] ?? `row${index + 1}`;
    const row = [label, ...(rowValues || [])];
    lines.push(row.map(escapeCsvValue).join(','));
  });
  return lines.join('\n');
};

/**
 * 下载 CSV 文件
 * @param {string} filename
 * @param {Array} rows
 */
export const downloadCsv = (filename, rows) => {
  const csv = buildCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * 下载热图 CSV
 * @param {string} filename
 * @param {Object} heatmap
 */
export const downloadHeatmapCsv = (filename, heatmap) => {
  const csv = buildHeatmapCsv(heatmap);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * 为散点图导出重新映射行列
 * @param {Array} rows
 * @param {Object} axisMap
 * @returns {Array}
 */
export const remapScatterRowsForExport = (rows, axisMap) => {
  if (!rows || rows.length === 0) return [];
  if (!axisMap?.x && !axisMap?.y) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };
    if (axisMap.x && Object.prototype.hasOwnProperty.call(next, 'x')) {
      next[axisMap.x] = next.x;
      delete next.x;
    }
    if (axisMap.y && Object.prototype.hasOwnProperty.call(next, 'y')) {
      next[axisMap.y] = next.y;
      delete next.y;
    }
    return next;
  });
};

/**
 * 格式化表格数值
 * @param {*} value
 * @returns {string}
 */
export const formatTableValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }
  return String(value);
};

/**
 * 生成时间戳文件名
 * @param {string} prefix
 * @returns {string}
 */
export const generateTimestampFilename = (prefix) => {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `${prefix}-${timestamp}.csv`;
};

/**
 * 清理文件名
 * @param {string} value
 * @returns {string}
 */
export const sanitizeFilename = (value) =>
  String(value || 'preview').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');
