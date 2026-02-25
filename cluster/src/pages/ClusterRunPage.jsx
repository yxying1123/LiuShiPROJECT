import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Save } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import ClusterResultsPanel from '../components/ClusterResultsPanel';
import { useDataContext } from '../context/data-context';

const ClusterRunPage = () => {
  const navigate = useNavigate();
  const { showCluster, heatmapPayload } = useDataContext();
  const isReady = Boolean(showCluster && heatmapPayload?.heatmap?.values?.length);
  const clusterResultsPanelRef = useRef(null);

  const handleSaveClick = () => {
    if (clusterResultsPanelRef.current) {
      clusterResultsPanelRef.current.openSaveDialog();
    }
  };

  return (
    <PageLayout
      title="聚类结果"
      subtitle="查看本次聚类分析的结果"
      containerClassName="max-w-none"
      cardClassName="min-h-[calc(100vh-140px)]"
      contentClassName="h-full"
      stackClassName="gap-4"
      actions={
        <div className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">结果聚类</h3>
          </div>
          <div className="flex items-center gap-3">
            {isReady && (
              <button
                type="button"
                onClick={handleSaveClick}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:from-amber-600 hover:to-rose-600 shadow-md shadow-amber-500/30"
              >
                <Save className="h-4 w-4" />
                保存结果
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/scatter')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              返回配置
            </button>
          </div>
        </div>
      }
    >
      <ClusterResultsPanel ref={clusterResultsPanelRef} />
    </PageLayout>
  );
};

export default ClusterRunPage;
