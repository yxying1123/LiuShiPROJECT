import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FileListPage from './FileListPage';

// Mock the hooks
vi.mock('../hooks/useFileOperations', () => ({
  useFileOperations: vi.fn(),
}));

vi.mock('../hooks/useDataIntegration', () => ({
  useDataIntegration: vi.fn(),
}));

vi.mock('../context/data-context', () => ({
  useDataContext: vi.fn(),
}));

import { useFileOperations } from '../hooks/useFileOperations';
import { useDataIntegration } from '../hooks/useDataIntegration';
import { useDataContext } from '../context/data-context';

describe('FileListPage', () => {
  const mockStartNewAnalysis = vi.fn();
  const mockFetchFiles = vi.fn();
  const mockDeleteFile = vi.fn();
  const mockDownloadFile = vi.fn();
  const mockUploadFiles = vi.fn();
  const mockPerformIntegration = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useDataContext.mockReturnValue({
      error: '',
      warning: '',
      startNewAnalysis: mockStartNewAnalysis,
    });

    useFileOperations.mockReturnValue({
      storedFiles: [],
      isLoading: false,
      fetchFiles: mockFetchFiles,
      deleteFile: mockDeleteFile,
      downloadFile: mockDownloadFile,
      uploadFiles: mockUploadFiles,
    });

    useDataIntegration.mockReturnValue({
      isIntegrating: false,
      filterValidFiles: vi.fn((files) => files.filter((f) => f.name.endsWith('.fcs'))),
      performIntegration: mockPerformIntegration,
    });
  });

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render file list page', () => {
    renderWithRouter(<FileListPage />);

    // Just verify the page renders without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('should render with files', () => {
    useFileOperations.mockReturnValue({
      storedFiles: [
        { name: 'test1.csv', size: 1024, modified: '2024-01-01T00:00:00Z' },
        { name: 'test2.csv', size: 2048, modified: '2024-01-02T00:00:00Z' },
      ],
      isLoading: false,
      fetchFiles: mockFetchFiles,
      deleteFile: mockDeleteFile,
      downloadFile: mockDownloadFile,
      uploadFiles: mockUploadFiles,
    });

    renderWithRouter(<FileListPage />);

    // Verify files are displayed
    expect(screen.getByText('test1.csv')).toBeInTheDocument();
    expect(screen.getByText('test2.csv')).toBeInTheDocument();
  });

  it('should open upload modal when CSV upload button clicked', () => {
    renderWithRouter(<FileListPage />);

    const uploadButton = screen.getByText('CSV文件导入');
    fireEvent.click(uploadButton);

    expect(screen.getByText('确认上传')).toBeInTheDocument();
  });

  it('should open integration modal when FCS import button clicked', () => {
    renderWithRouter(<FileListPage />);

    const integrationButton = screen.getByText('FCS文件导入');
    fireEvent.click(integrationButton);

    expect(screen.getByText('开始整合')).toBeInTheDocument();
  });

  it('should show integration loading overlay', () => {
    useDataIntegration.mockReturnValue({
      isIntegrating: true,
      filterValidFiles: vi.fn(),
      performIntegration: mockPerformIntegration,
    });

    renderWithRouter(<FileListPage />);

    expect(screen.getByText('数据导入中，请稍候...')).toBeInTheDocument();
  });
});
