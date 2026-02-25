import Papa from 'papaparse';

export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error('CSV解析错误: ' + results.errors[0].message));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(new Error('文件读取错误: ' + error.message));
      }
    });
  });
};

export const extractNumericColumns = (data) => {
  if (!data || data.length === 0) return [];
  
  const firstRow = data[0];
  const numericColumns = [];
  
  Object.keys(firstRow).forEach(key => {
    const value = firstRow[key];
    if (value !== null && value !== undefined && value !== '') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        numericColumns.push(key);
      }
    }
  });
  
  return numericColumns;
};

export const prepareScatterData = (data, xColumn, yColumn, options = {}) => {
  const { sourceId, sourceName, idOffset = 0 } = options;
  return data
    .map((row, index) => ({
      id: idOffset + index,
      x: parseFloat(row[xColumn]),
      y: parseFloat(row[yColumn]),
      sourceId,
      source: sourceName,
      originalData: row,
    }))
    .filter(point => !isNaN(point.x) && !isNaN(point.y));
};
