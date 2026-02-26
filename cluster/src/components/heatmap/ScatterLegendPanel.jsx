import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';

/**
 * 散点图图例面板组件
 */
const ScatterLegendPanel = ({
  // 颜色模式
  activeColorMode,
  colorModeOptions,
  onColorModeChange,
  // 数值色阶
  colorFieldOptions,
  scatterColorField,
  setScatterColorField,
  colorGradient,
  colorRange,
  // 点大小
  scatterPointSize,
  setScatterPointSize,
  // 来源筛选
  isSourceOpen,
  setIsSourceOpen,
  sourceItems,
  selectedSources,
  setSelectedSources,
  // 聚类筛选
  isGroupOpen,
  setIsGroupOpen,
  legendItems,
  selectedGroups,
  setSelectedGroups,
  // 预览
  isPreviewGenerating,
  onGeneratePreviews,
  filteredPointsCount,
  totalPointsCount,
}) => {
  const legendCount = activeColorMode === 'source' ? sourceItems.length : legendItems.length;

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="text-sm font-semibold text-slate-800">图例</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{legendCount} 类</span>
          <button
            type="button"
            onClick={onGeneratePreviews}
            disabled={isPreviewGenerating || filteredPointsCount === 0}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              isPreviewGenerating || filteredPointsCount === 0
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isPreviewGenerating ? '生成中' : '一键生成'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-3">
        {/* 颜色方式 */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="text-xs font-semibold text-slate-700">颜色方式</div>
          <div className="mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  <span>{colorModeOptions.find((item) => item.value === activeColorMode)?.label}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2">
                  {colorModeOptions.map((item) => {
                    const checked = activeColorMode === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => onColorModeChange(item.value)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                          checked
                            ? 'border-slate-200 bg-slate-100 text-slate-700'
                            : 'border-transparent text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        {checked ? <span className="text-xs text-slate-500">当前</span> : null}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 数值色阶 */}
        {activeColorMode === 'value' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-xs font-semibold text-slate-700">数值色阶</div>
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                  >
                    <span>{scatterColorField || '暂无可选列'}</span>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">变量</span>
                    {scatterColorField && (
                      <button
                        type="button"
                        onClick={() => setScatterColorField('')}
                        className="text-xs text-slate-500 transition hover:text-slate-700"
                      >
                        清空
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {colorFieldOptions.map((label) => {
                      const checked = scatterColorField === label;
                      return (
                        <label
                          key={label}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              if (value === true) {
                                setScatterColorField(label);
                              } else if (checked) {
                                setScatterColorField('');
                              }
                            }}
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })}
                    {colorFieldOptions.length === 0 && (
                      <div className="text-xs text-slate-500">暂无可选列</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div
              className="mt-3 h-2.5 w-full rounded-full"
              style={{ background: colorGradient }}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{colorRange ? colorRange.min.toFixed(2) : '暂无范围'}</span>
              <span>{colorRange ? colorRange.max.toFixed(2) : '暂无范围'}</span>
            </div>
          </div>
        )}

        {/* 点大小 */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">点大小</span>
            <span className="text-xs text-slate-500">{scatterPointSize.toFixed(1)} px</span>
          </div>
          <div className="mt-3">
            <Slider
              value={[scatterPointSize]}
              min={2}
              max={12}
              step={0.5}
              onValueChange={(value) => {
                const next = Number(value?.[0]);
                if (Number.isFinite(next)) {
                  setScatterPointSize(next);
                }
              }}
            />
          </div>
        </div>

        {/* 来源筛选 */}
        <div>
          <button
            type="button"
            onClick={() => setIsSourceOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            来源筛选
            {isSourceOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
          {isSourceOpen && (
            <div className="mt-2 space-y-2">
              {sourceItems.map((item) => {
                const checked = Array.isArray(selectedSources)
                  ? selectedSources.includes(item.label)
                  : true;
                return (
                  <label
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSelectedSources((prev) => {
                            const current = Array.isArray(prev) ? prev : [];
                            if (value === true) {
                              return current.includes(item.label)
                                ? current
                                : [...current, item.label];
                            }
                            return current.filter((entry) => entry !== item.label);
                          })
                        }
                      />
                      {activeColorMode === 'source' && (
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ background: item.color }}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {item.count.toLocaleString()} / {item.total.toLocaleString()}
                    </span>
                  </label>
                );
              })}
              {sourceItems.length === 0 && (
                <div className="text-xs text-slate-500">暂无来源信息</div>
              )}
            </div>
          )}
        </div>

        {/* 聚类筛选 */}
        <div>
          <button
            type="button"
            onClick={() => setIsGroupOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            聚类筛选
            {isGroupOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
          {isGroupOpen && (
            <div className="mt-2 space-y-2">
              {legendItems.map((item) => {
                const checked = Array.isArray(selectedGroups)
                  ? selectedGroups.includes(item.label)
                  : true;
                return (
                  <label
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSelectedGroups((prev) => {
                            const current = Array.isArray(prev) ? prev : [];
                            if (value === true) {
                              return current.includes(item.label)
                                ? current
                                : [...current, item.label];
                            }
                            return current.filter((entry) => entry !== item.label);
                          })
                        }
                      />
                      {activeColorMode === 'cluster' && (
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ background: item.color }}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {item.count.toLocaleString()} / {item.total.toLocaleString()}
                    </span>
                  </label>
                );
              })}
              {legendItems.length === 0 && (
                <div className="text-xs text-slate-500">暂无聚类信息</div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ScatterLegendPanel;
