import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const handlers = [
  // GET / - Root endpoint
  http.get(`${API_BASE_URL}/`, () => {
    return HttpResponse.json({
      code: 200,
      data: { message: 'Hello World', time: new Date().toString() },
    });
  }),

  // GET /files - List files
  http.get(`${API_BASE_URL}/files`, () => {
    return HttpResponse.json({
      code: 200,
      data: {
        files: [
          { name: 'test1.csv', size: 1024, modified: '2024-01-01T00:00:00Z' },
          { name: 'test2.csv', size: 2048, modified: '2024-01-02T00:00:00Z' },
        ],
      },
    });
  }),

  // POST /files/upload - Upload files
  http.post(`${API_BASE_URL}/files/upload`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        files: [{ name: 'uploaded.csv', size: 1024, modified: new Date().toISOString() }],
      },
    });
  }),

  // DELETE /files/:filename - Delete file
  http.delete(`${API_BASE_URL}/files/:filename`, ({ params }) => {
    return HttpResponse.json({
      code: 200,
      data: { name: params.filename },
    });
  }),

  // GET /files/download/:filename - Download file
  http.get(`${API_BASE_URL}/files/download/:filename`, () => {
    return new HttpResponse('file content', {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="test.csv"',
      },
    });
  }),

  // POST /files/metadata - Get file metadata
  http.post(`${API_BASE_URL}/files/metadata`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        files: [
          {
            name: 'test.csv',
            size: 1024,
            modified: '2024-01-01T00:00:00Z',
            columns: ['col1', 'col2', 'col3'],
            numericColumns: ['col1', 'col2'],
          },
        ],
      },
    });
  }),

  // POST /upload/file - Upload and reduce dimensions
  http.post(`${API_BASE_URL}/upload/file`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        xColumn: [1.0, 2.0, 3.0],
        yColumn: [4.0, 5.0, 6.0],
        sample: ['file1', 'file1', 'file1'],
        col1: [1, 2, 3],
        col2: [4, 5, 6],
      },
    });
  }),

  // POST /upload/xy - Upload XY coordinates
  http.post(`${API_BASE_URL}/upload/xy`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        xColumn: [1.0, 2.0, 3.0],
        yColumn: [4.0, 5.0, 6.0],
        sample: ['file1', 'file1', 'file1'],
      },
    });
  }),

  // POST /upload/flow/merge - FCS file conversion
  http.post(`${API_BASE_URL}/upload/flow/merge`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        files: [{ name: 'converted.csv', size: 1024, modified: new Date().toISOString() }],
      },
    });
  }),

  // POST /select - Select and reduce dimensions
  http.post(`${API_BASE_URL}/select`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        xColumn: [1.0, 2.0, 3.0],
        yColumn: [4.0, 5.0, 6.0],
        sample: ['file1', 'file1', 'file1'],
      },
    });
  }),

  // POST /heatmap/cluster-tree/points - Heatmap clustering
  http.post(`${API_BASE_URL}/heatmap/cluster-tree/points`, async () => {
    return HttpResponse.json({
      code: 200,
      data: {
        heatmap: {
          rows: ['cluster1', 'cluster2'],
          cols: ['col1', 'col2'],
          values: [[1.0, 2.0], [3.0, 4.0]],
        },
        rowTree: { name: 'root', children: [{ name: 'cluster1' }, { name: 'cluster2' }] },
        colTree: { name: 'root', children: [{ name: 'col1' }, { name: 'col2' }] },
        pointGroups: [0, 1, 0],
      },
    });
  }),
];
