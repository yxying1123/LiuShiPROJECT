/**
 * 数据导出工具函数
 * 提供 CSV、热图 CSV、PDF 等导出功能
 */

import { jsPDF } from 'jspdf';

/**
 * 将图片 URL 转换为 PDF 并下载
 * @param {string} imageUrl - 图片的 Data URL 或 Blob URL
 * @param {string} filename - PDF 文件名（不含扩展名）
 * @param {Object} options - 配置选项
 * @param {number} options.orientation - 页面方向 'p'|'portrait' 或 'l'|'landscape'
 * @param {string} options.format - 页面格式 'a4', 'letter' 等
 */
export const downloadImageAsPdf = async (imageUrl, filename, options = {}) => {
  if (!imageUrl) return;

  const { orientation = 'portrait', format = 'a4' } = options;

  try {
    // 加载图片获取尺寸
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // 创建 PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // 计算图片在 PDF 中的尺寸（保持宽高比）
    const imgWidth = img.width;
    const imgHeight = img.height;
    const aspectRatio = imgWidth / imgHeight;

    let pdfImgWidth = pageWidth - margin * 2;
    let pdfImgHeight = pdfImgWidth / aspectRatio;

    // 如果高度超出页面，则以高度为准
    if (pdfImgHeight > pageHeight - margin * 2) {
      pdfImgHeight = pageHeight - margin * 2;
      pdfImgWidth = pdfImgHeight * aspectRatio;
    }

    // 居中放置
    const x = (pageWidth - pdfImgWidth) / 2;
    const y = (pageHeight - pdfImgHeight) / 2;

    // 添加图片到 PDF
    pdf.addImage(imageUrl, 'PNG', x, y, pdfImgWidth, pdfImgHeight);

    // 下载 PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('生成 PDF 失败:', error);
    throw error;
  }
};

/**
 * 从 SVG 元素生成 PDF 并下载
 * @param {SVGElement} svgElement - SVG 元素
 * @param {string} filename - PDF 文件名（不含扩展名）
 * @param {Object} options - 配置选项
 */
export const downloadSvgAsPdf = async (svgElement, filename, options = {}) => {
  if (!svgElement) return;

  const { orientation = 'landscape', format = 'a4' } = options;

  try {
    // 克隆 SVG 并添加命名空间
    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // 加载图片
    const img = new Image();
    img.src = svgUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // 创建 PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // 计算图片尺寸
    const imgWidth = img.width;
    const imgHeight = img.height;
    const aspectRatio = imgWidth / imgHeight;

    let pdfImgWidth = pageWidth - margin * 2;
    let pdfImgHeight = pdfImgWidth / aspectRatio;

    if (pdfImgHeight > pageHeight - margin * 2) {
      pdfImgHeight = pageHeight - margin * 2;
      pdfImgWidth = pdfImgHeight * aspectRatio;
    }

    const x = (pageWidth - pdfImgWidth) / 2;
    const y = (pageHeight - pdfImgHeight) / 2;

    pdf.addImage(svgUrl, 'SVG', x, y, pdfImgWidth, pdfImgHeight);
    pdf.save(`${filename}.pdf`);

    URL.revokeObjectURL(svgUrl);
  } catch (error) {
    console.error('从 SVG 生成 PDF 失败:', error);
    throw error;
  }
};

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
