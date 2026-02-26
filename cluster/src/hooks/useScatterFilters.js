import { useState, useEffect, useMemo } from 'react';
import { normalizeSourceValue, normalizeGroupValue } from '../utils/dataHelpers';

/**
 * 散点图筛选管理 Hook
 * 处理来源和聚类筛选逻辑
 */
export const useScatterFilters = (scatterPoints, hasClusterPoints) => {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [colorMode, setColorMode] = useState('source');

  // 分组选项
  const groupOptions = useMemo(() => {
    const groups = new Set();
    let hasEmpty = false;

    (scatterPoints || []).forEach((point) => {
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
  }, [scatterPoints, hasClusterPoints]);

  // 来源选项
  const sourceOptions = useMemo(() => {
    const sources = new Set();
    let hasEmpty = false;

    (scatterPoints || []).forEach((point) => {
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
  }, [scatterPoints]);

  // 初始化选中状态
  useEffect(() => {
    setSelectedGroups((prev) => {
      if (groupOptions.length === 0) return [];
      if (prev === null || prev.length === 0) return groupOptions;
      const valid = prev.filter((group) => groupOptions.includes(group));
      return valid.length > 0 ? valid : groupOptions;
    });
  }, [groupOptions]);

  useEffect(() => {
    setSelectedSources((prev) => {
      if (sourceOptions.length === 0) return [];
      if (prev === null || prev.length === 0) return sourceOptions;
      const valid = prev.filter((source) => sourceOptions.includes(source));
      return valid.length > 0 ? valid : sourceOptions;
    });
  }, [sourceOptions]);

  // 过滤后的数据
  const filteredScatterPoints = useMemo(() => {
    const hasGroupFilter = Array.isArray(selectedGroups) && selectedGroups.length > 0;
    const hasSourceFilter = Array.isArray(selectedSources) && selectedSources.length > 0;

    if (!hasGroupFilter && !hasSourceFilter) return scatterPoints || [];

    return (scatterPoints || []).filter((point) => {
      const groupValue = normalizeGroupValue(point?.group ?? point?.cluster) || '未分组';
      const sourceValue = normalizeSourceValue(point?.source ?? point?.sourceId);

      if (hasGroupFilter && !selectedGroups.includes(groupValue)) return false;
      if (hasSourceFilter && !selectedSources.includes(sourceValue)) return false;
      return true;
    });
  }, [scatterPoints, selectedGroups, selectedSources]);

  // 图例项
  const legendItems = useMemo(() => {
    const filteredCounts = new Map();
    const totalCounts = new Map();

    const getLabel = (point) =>
      hasClusterPoints
        ? point?.group === null || point?.group === undefined || String(point.group).trim() === ''
          ? '未分组'
          : String(point.group)
        : normalizeSourceValue(point?.source ?? point?.sourceId);

    (scatterPoints || []).forEach((point) => {
      const label = getLabel(point);
      totalCounts.set(label, (totalCounts.get(label) || 0) + 1);
    });

    filteredScatterPoints.forEach((point) => {
      const label = getLabel(point);
      filteredCounts.set(label, (filteredCounts.get(label) || 0) + 1);
    });

    const order = groupOptions.slice();
    if (totalCounts.has('未分组') && !order.includes('未分组')) {
      order.push('未分组');
    }

    const total = order.length || 1;

    // 颜色函数
    const getColor = (index) => {
      const palette = [
        '#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444',
        '#0ea5e9', '#eab308', '#14b8a6',
      ];
      if (total <= palette.length) {
        return palette[index % palette.length];
      }
      const hue = (index * 360) / total;
      return `hsl(${hue.toFixed(2)}, 68%, 46%)`;
    };

    return order.map((label, index) => ({
      label,
      count: filteredCounts.get(label) || 0,
      total: totalCounts.get(label) || 0,
      color: getColor(index),
    }));
  }, [filteredScatterPoints, scatterPoints, hasClusterPoints, groupOptions]);

  // 来源项
  const sourceItems = useMemo(() => {
    const filteredCounts = new Map();
    const totalCounts = new Map();

    const getLabel = (point) => normalizeSourceValue(point?.source ?? point?.sourceId);

    (scatterPoints || []).forEach((point) => {
      const label = getLabel(point);
      totalCounts.set(label, (totalCounts.get(label) || 0) + 1);
    });

    filteredScatterPoints.forEach((point) => {
      const label = getLabel(point);
      filteredCounts.set(label, (filteredCounts.get(label) || 0) + 1);
    });

    const order = sourceOptions.slice();
    if (totalCounts.has('未知') && !order.includes('未知')) {
      order.push('未知');
    }

    const total = order.length || 1;

    const getColor = (index) => {
      const palette = [
        '#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444',
        '#0ea5e9', '#eab308', '#14b8a6',
      ];
      if (total <= palette.length) {
        return palette[index % palette.length];
      }
      const hue = (index * 360) / total;
      return `hsl(${hue.toFixed(2)}, 68%, 46%)`;
    };

    return order.map((label, index) => ({
      label,
      count: filteredCounts.get(label) || 0,
      total: totalCounts.get(label) || 0,
      color: getColor(index),
    }));
  }, [filteredScatterPoints, scatterPoints, sourceOptions]);

  return {
    // 筛选状态
    selectedGroups,
    setSelectedGroups,
    selectedSources,
    setSelectedSources,
    colorMode,
    setColorMode,
    // 选项
    groupOptions,
    sourceOptions,
    // 数据
    filteredScatterPoints,
    legendItems,
    sourceItems,
  };
};
