import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ColumnSelector from '../components/ColumnSelector';
import PageLayout from '../components/PageLayout';
import { AnalysisBreadcrumb, AnalysisStepper } from '../components/AnalysisFlowHeader';
import { useDataContext } from '../context/data-context';
import { requestApi } from '../utils/apiClient';

const AxisSelectionPage = () => {
  const {
    datasets,
    uploadedFiles,
    numericColumns,
    selectedX,
    selectedY,
    error,
    warning,
    isLoading,
    handleColumnChange,
    fetchScatter2D,
    loadAnalysisFiles,
    setScatterMode,
  } = useDataContext();
  const navigate = useNavigate();
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);

  const metadataByName = useMemo(() => {
    const map = new Map();
    datasets.forEach((dataset) => {
      map.set(dataset.name, dataset);
    });
    return map;
  }, [datasets]);

  useEffect(() => {
    const loadFiles = async () => {
      setIsFilesLoading(true);
      try {
        const response = await requestApi('/files');
        const files = Array.isArray(response) ? response : response?.files || [];
        const filtered = files.filter((file) => {
          const ext = file?.name?.split('.').pop()?.toLowerCase() || '';
          return ['csv', 'txt'].includes(ext);
        });
        setAvailableFiles(filtered);
      } catch (err) {
        toast.error(err.message || '加载文件列表失败');
      } finally {
        setIsFilesLoading(false);
      }
    };
    loadFiles();
  }, []);

  useEffect(() => {
    const names = (uploadedFiles || []).map((file) => file.name).filter(Boolean);
    if (names.length > 0 && selectedFiles.length === 0) {
      setSelectedFiles(names);
    }
  }, [uploadedFiles, selectedFiles.length]);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      loadAnalysisFiles([]);
      return;
    }
    const run = async () => {
      setIsMetadataLoading(true);
      await loadAnalysisFiles(selectedFiles);
      setIsMetadataLoading(false);
    };
    run();
  }, [loadAnalysisFiles, selectedFiles]);

  const handleNext = async () => {
    if (!selectedX || !selectedY || isLoading) return;
    setScatterMode('2d');
    const success = await fetchScatter2D({
      xColumn: selectedX,
      yColumn: selectedY,
      sources: selectedFiles,
    });
    if (success) {
      navigate('/scatter');
    }
  };

  const toggleFile = (name) => {
    setSelectedFiles((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }
      return [...prev, name];
    });
  };

  return (
    <PageLayout
      title="选择坐标轴"
      subtitle="请选择用于散点图展示的X/Y轴字段"
      error={error}
      warning={warning}
      breadcrumb={<AnalysisBreadcrumb currentStep={2} />}
      actions={
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          返回结果列表
        </button>
      }
    >
      <div className="space-y-6">
        <AnalysisStepper currentStep={2} />
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-700">选择分析文件</h3>
          {isFilesLoading ? (
            <div className="flex items-center gap-3 text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
              正在加载文件列表...
            </div>
          ) : availableFiles.length === 0 ? (
            <div className="text-slate-500">暂无可用文件，请先上传。</div>
          ) : (
            <div className="space-y-3">
              {availableFiles.map((file) => {
                const isChecked = selectedFiles.includes(file.name);
                const metadata = metadataByName.get(file.name);
                const columns = metadata?.columns || [];
                return (
                  <label
                    key={file.name}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      isChecked
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500"
                      checked={isChecked}
                      onChange={() => toggleFile(file.name)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">{file.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {columns.length > 0
                          ? `变量: ${columns.join(', ')}`
                          : isChecked
                            ? '正在加载列信息...'
                            : '未加载列信息'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {selectedFiles.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-slate-600">
            请先选择需要分析的文件。
          </div>
        ) : isMetadataLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-slate-200 border-t-amber-600 animate-spin" />
            <p className="font-medium text-slate-700">正在加载列信息...</p>
          </div>
        ) : isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-slate-200 border-t-amber-600 animate-spin" />
            <p className="font-medium text-slate-700">正在生成散点图数据...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ColumnSelector
              columns={numericColumns}
              selectedX={selectedX}
              selectedY={selectedY}
              onXChange={(value) => handleColumnChange(value, selectedY)}
              onYChange={(value) => handleColumnChange(selectedX, value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                返回上一步
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedX || !selectedY || isLoading}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition ${
                  !selectedX || !selectedY || isLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isLoading ? '生成中...' : '进入散点图'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AxisSelectionPage;
