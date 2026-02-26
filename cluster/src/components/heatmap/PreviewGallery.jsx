import React from 'react';

/**
 * 预览图库组件
 */
const PreviewGallery = ({
  previewItems,
  isGenerating,
  isStale,
  error,
  hasGenerated,
  previewTitle,
  showColorChip,
  onSelect,
  onGenerate,
}) => {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/95">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="text-sm font-semibold text-slate-800">图片预览</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{previewItems.length} 张</span>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              isGenerating
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isGenerating ? '生成中' : '重新生成'}
          </button>
        </div>
      </div>
      <div className="p-4">
        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-600" />
            正在生成预览...
          </div>
        )}

        {!isGenerating && isStale && (
          <div className="mb-2 text-xs text-amber-600">
            当前设置已变更，点击"重新生成"可更新预览。
          </div>
        )}

        {!isGenerating && error && (
          <div className="text-sm text-rose-500">{error}</div>
        )}

        {!isGenerating && !error && previewItems.length === 0 && !hasGenerated && (
          <div className="text-sm text-slate-500">
            点击"一键生成"生成{previewTitle}预览。
          </div>
        )}

        {!isGenerating && !error && previewItems.length === 0 && hasGenerated && (
          <div className="text-sm text-slate-500">暂无可用预览。</div>
        )}

        {!isGenerating && previewItems.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {previewItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelect(item)}
                className="group rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex h-32 w-full items-center justify-center rounded-lg bg-slate-50">
                  <img
                    src={item.url}
                    alt={item.label}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex min-w-0 items-center gap-2">
                    {showColorChip && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: item.color }}
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span>{item.count.toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewGallery;
