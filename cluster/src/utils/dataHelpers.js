/**
 * 数据处理辅助函数
 */

/**
 * 归一化来源值
 * @param {*} value
 * @returns {string}
 */
export const normalizeSourceValue = (value) =>
  value === null || value === undefined || value === '' ? '未知' : String(value);

/**
 * 归一化分组值
 * @param {*} value
 * @returns {string}
 */
export const normalizeGroupValue = (value) =>
  value === null || value === undefined || value === '' ? '' : String(value);

/**
 * 数值限制函数
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clampValue = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (!Number.isFinite(max)) return Math.max(min, value);
  return Math.max(min, Math.min(max, value));
};

/**
 * 提取散点表列
 * @param {Array} rows
 * @returns {Array}
 */
export const buildScatterTableColumns = (rows) => {
  if (!rows || rows.length === 0) return [];
  const excluded = new Set(['id', 'originalData', '__index']);
  const keys = new Set();
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!excluded.has(key)) {
        keys.add(key);
      }
    });
  });
  const preferred = ['group', 'source', 'sourceId', 'x', 'y'];
  const ordered = preferred.filter((key) => keys.has(key));
  const rest = Array.from(keys).filter((key) => !preferred.includes(key));
  return [...ordered, ...rest];
};

/**
 * 获取数值列选项
 * @param {Array} points
 * @param {Set} excluded
 * @returns {Array}
 */
export const getNumericColumnOptions = (points, excluded = new Set()) => {
  if (!points || points.length === 0) return [];
  const keys = Object.keys(points[0] || {}).filter((key) => !excluded.has(key));
  return keys.filter((key) =>
    points.some((point) => Number.isFinite(Number(point[key])))
  );
};

/**
 * 获取颜色字段选项
 * @param {Array} points
 * @returns {Array}
 */
export const getColorFieldOptions = (points) => {
  if (!points || points.length === 0) return [];
  const excluded = new Set(['id', 'x', 'y', 'source', 'sourceId', 'group', 'cluster']);
  return getNumericColumnOptions(points, excluded);
};

/**
 * 计算数值范围
 * @param {Array} points
 * @param {string} field
 * @returns {{min: number, max: number} | null}
 */
export const calculateValueRange = (points, field) => {
  if (!field || !points || points.length === 0) return null;
  const values = points
    .map((point) => Number(point?.[field]))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

/**
 * 过滤散点数据
 * @param {Array} points
 * @param {Array} selectedGroups
 * @param {Array} selectedSources
 * @returns {Array}
 */
export const filterScatterPoints = (points, selectedGroups, selectedSources) => {
  const hasGroupFilter = Array.isArray(selectedGroups) && selectedGroups.length > 0;
  const hasSourceFilter = Array.isArray(selectedSources) && selectedSources.length > 0;

  if (!hasGroupFilter && !hasSourceFilter) return points || [];

  return (points || []).filter((point) => {
    const groupValue = normalizeGroupValue(point?.group ?? point?.cluster) || '未分组';
    const sourceValue = normalizeSourceValue(point?.source ?? point?.sourceId);

    if (hasGroupFilter && !selectedGroups.includes(groupValue)) return false;
    if (hasSourceFilter && !selectedSources.includes(sourceValue)) return false;
    return true;
  });
};

/**
 * 获取分组选项
 * @param {Array} points
 * @param {boolean} hasClusterPoints
 * @returns {Array}
 */
export const getGroupOptions = (points, hasClusterPoints = false) => {
  const groups = new Set();
  let hasEmpty = false;

  (points || []).forEach((point) => {
    const groupValue = hasClusterPoints
      ? point?.group === null || point?.group === undefined || String(point.group).trim() === ''
        ? ''
        : String(point.group)
      : normalizeGroupValue(point?.group ?? point?.cluster);

    if (groupValue === '') {
      hasEmpty = true;
    } else {
      groups.add(groupValue);
    }
  });

  const ordered = Array.from(groups).sort((a, b) => Number(a) - Number(b));
  if (hasEmpty) {
    ordered.push('未分组');
  }
  return ordered;
};

/**
 * 获取来源选项
 * @param {Array} points
 * @returns {Array}
 */
export const getSourceOptions = (points) => {
  const sources = new Set();
  let hasEmpty = false;

  (points || []).forEach((point) => {
    const sourceValue = normalizeSourceValue(point?.source ?? point?.sourceId);
    if (sourceValue === '未知') {
      hasEmpty = true;
    } else {
      sources.add(sourceValue);
    }
  });

  const ordered = Array.from(sources);
  if (hasEmpty) {
    ordered.push('未知');
  }
  return ordered;
};
