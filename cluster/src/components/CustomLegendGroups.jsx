import React, { useState, useMemo } from 'react';
import { ChevronDown, Plus, X, Edit2, Check, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

// 预设颜色板
const PRESET_COLORS = [
  '#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444',
  '#0ea5e9', '#eab308', '#14b8a6', '#f43f5e', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f59e0b', '#ec4899', '#6366f1',
  '#22c55e', '#3b82f6', '#ef4444', '#f97316', '#10b981',
];

/**
 * 自定义图例分组管理组件（合并编辑和筛选功能）
 * @param {Object} props
 * @param {string} props.mode - 当前模式: 'default' | 'custom'
 * @param {Function} props.onModeChange - 模式切换回调
 * @param {Array} props.sourceItems - 来源项列表 [{label, count, color}]
 * @param {Array} props.customGroups - 自定义分组列表 [{id, name, color, sources: []}]
 * @param {Function} props.onCustomGroupsChange - 自定义分组变化回调
 * @param {Set} props.selectedItems - 选中的项目集合
 * @param {Function} props.onSelectionChange - 选中状态变化回调 (item, isSelected)
 * @param {string} props.type - 类型: 'source' | 'cluster'
 * @param {boolean} props.hideModeSelector - 是否隐藏分组方式选择器
 */
const CustomLegendGroups = ({
  mode = 'default',
  onModeChange,
  sourceItems = [],
  customGroups = [],
  onCustomGroupsChange,
  selectedItems = [],
  onSelectionChange,
  type = 'source',
  hideModeSelector = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const [selectedSourcesForGroup, setSelectedSourcesForGroup] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColorInput, setCustomColorInput] = useState('');

  const typeLabel = type === 'source' ? '来源' : '聚类';
  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  // 获取可用的来源（未被其他组使用的）
  const getAvailableSources = (excludeGroupId = null) => {
    const usedSources = new Set();
    customGroups.forEach((group) => {
      if (group.id !== excludeGroupId) {
        group.sources.forEach((s) => usedSources.add(s));
      }
    });
    return sourceItems.filter((item) => !usedSources.has(item.label));
  };

  // 计算未分组的来源
  const ungroupedSources = useMemo(() => {
    const groupedSources = new Set();
    customGroups.forEach((group) => {
      group.sources.forEach((s) => groupedSources.add(s));
    });
    return sourceItems.filter((item) => !groupedSources.has(item.label));
  }, [sourceItems, customGroups]);

  // 计算自定义分组的总点数
  const getGroupTotalCount = (group) => {
    return group.sources.reduce((sum, s) => {
      const item = sourceItems.find((i) => i.label === s);
      return sum + (item?.count || 0);
    }, 0);
  };

  // 计算自定义分组的选中数量
  const getGroupSelectedCount = (group) => {
    return group.sources.filter((s) => selectedSet.has(s)).length;
  };

  // 处理创建新组
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      color: newGroupColor,
      sources: selectedSourcesForGroup,
    };
    
    onCustomGroupsChange([...customGroups, newGroup]);
    resetEditingState();
  };

  // 处理更新组
  const handleUpdateGroup = () => {
    if (!editingGroup || !newGroupName.trim()) return;
    
    const updated = customGroups.map((g) =>
      g.id === editingGroup.id
        ? {
            ...g,
            name: newGroupName.trim(),
            color: newGroupColor,
            sources: selectedSourcesForGroup,
          }
        : g
    );
    
    onCustomGroupsChange(updated);
    resetEditingState();
  };

  // 处理删除组
  const handleDeleteGroup = (e, groupId) => {
    e.stopPropagation();
    onCustomGroupsChange(customGroups.filter((g) => g.id !== groupId));
  };

  // 重置编辑状态
  const resetEditingState = () => {
    setIsEditing(false);
    setEditingGroup(null);
    setNewGroupName('');
    setNewGroupColor(PRESET_COLORS[0]);
    setSelectedSourcesForGroup([]);
    setCustomColorInput('');
  };

  // 开始编辑组
  const startEditingGroup = (e, group) => {
    e.stopPropagation();
    const available = getAvailableSources(group.id);
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color);
    setSelectedSourcesForGroup(group.sources);
    setCustomColorInput(group.color);
    setIsEditing(true);
  };

  // 开始创建新组
  const startCreatingGroup = () => {
    const available = getAvailableSources();
    setEditingGroup(null);
    setNewGroupName(`自定义组 ${customGroups.length + 1}`);
    setNewGroupColor(PRESET_COLORS[customGroups.length % PRESET_COLORS.length]);
    setSelectedSourcesForGroup(available.length > 0 ? [available[0].label] : []);
    setCustomColorInput(PRESET_COLORS[customGroups.length % PRESET_COLORS.length]);
    setIsEditing(true);
  };

  // 切换来源选择
  const toggleSourceSelection = (sourceLabel) => {
    setSelectedSourcesForGroup((prev) =>
      prev.includes(sourceLabel)
        ? prev.filter((s) => s !== sourceLabel)
        : [...prev, sourceLabel]
    );
  };

  // 验证颜色输入
  const isValidColor = (color) => {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
  };

  // 处理自定义颜色输入
  const handleCustomColorChange = (value) => {
    setCustomColorInput(value);
    if (isValidColor(value)) {
      setNewGroupColor(value);
    }
  };

  // 处理分组卡片点击（切换整个组的选中状态）
  const handleGroupClick = (group) => {
    const groupSources = new Set(group.sources);
    const selectedCount = group.sources.filter((s) => selectedSet.has(s)).length;
    const isFullySelected = selectedCount === group.sources.length;
    
    if (isFullySelected) {
      // 取消选中组内所有来源
      group.sources.forEach((s) => onSelectionChange(s, false));
    } else {
      // 选中组内所有来源
      group.sources.forEach((s) => onSelectionChange(s, true));
    }
  };

  // 处理未分组项点击
  const handleUngroupedClick = (item) => {
    const isSelected = selectedSet.has(item.label);
    onSelectionChange(item.label, !isSelected);
  };

  return (
    <div className="space-y-3">
      {/* 模式切换 - 可通过 hideModeSelector 隐藏 */}
      {!hideModeSelector && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">分组方式</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-slate-300"
              >
                <span>{mode === 'custom' ? '自定义' : '默认'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              <button
                type="button"
                onClick={() => onModeChange('default')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  mode === 'default'
                    ? 'bg-slate-100 text-slate-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>默认</span>
                {mode === 'default' && <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onModeChange('custom')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  mode === 'custom'
                    ? 'bg-slate-100 text-slate-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>自定义</span>
                {mode === 'custom' && <Check className="h-3.5 w-3.5" />}
              </button>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* 自定义模式 - 合并编辑和筛选 */}
      {mode === 'custom' && (
        <div className="space-y-2">
          {/* 自定义组卡片（可点击切换选中状态） */}
          {customGroups.map((group) => {
            const selectedCount = getGroupSelectedCount(group);
            const totalCount = group.sources.length;
            const isFullySelected = selectedCount === totalCount && totalCount > 0;
            const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;
            const groupTotalPoints = getGroupTotalCount(group);
            
            return (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`relative rounded-lg border p-3 cursor-pointer transition ${
                  isFullySelected
                    ? 'border-slate-300 bg-white'
                    : isPartiallySelected
                      ? 'border-slate-200 bg-slate-50/70'
                      : 'border-slate-200 bg-slate-100/50'
                }`}
              >
                {/* 选中指示器 */}
                <div className="absolute top-3 right-3">
                  {isFullySelected ? (
                    <CheckCircle2 className="h-4 w-4 text-slate-700" />
                  ) : isPartiallySelected ? (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-400 bg-slate-400/30" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                  )}
                </div>

                {/* 组信息 */}
                <div className="flex items-center gap-2 pr-6">
                  <span
                    className="h-4 w-4 rounded flex-shrink-0"
                    style={{ 
                      backgroundColor: group.color,
                      opacity: isFullySelected || isPartiallySelected ? 1 : 0.5 
                    }}
                  />
                  <span className={`text-sm font-medium ${
                    isFullySelected || isPartiallySelected ? 'text-slate-700' : 'text-slate-500'
                  }`}>
                    {group.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({selectedCount}/{totalCount} {typeLabel})
                  </span>
                </div>

                {/* 来源标签 */}
                <div className="mt-2 flex flex-wrap gap-1 pr-6">
                  {group.sources.map((sourceLabel) => {
                    const sourceItem = sourceItems.find((s) => s.label === sourceLabel);
                    const isSourceSelected = selectedSet.has(sourceLabel);
                    return (
                      <span
                        key={sourceLabel}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] transition ${
                          isSourceSelected
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-100/50 text-slate-400'
                        }`}
                      >
                        {sourceLabel}
                        {sourceItem && (
                          <span className={`ml-1 ${isSourceSelected ? 'text-slate-400' : 'text-slate-300'}`}>
                            ({sourceItem.count})
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* 统计数量 */}
                <div className="mt-2 text-xs text-slate-500">
                  共 {groupTotalPoints.toLocaleString()} 个点
                </div>

                {/* 操作按钮（阻止冒泡） */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => startEditingGroup(e, group)}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteGroup(e, group.id)}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* 未分组的来源 */}
          {ungroupedSources.length > 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/30 p-3">
              <div className="text-xs font-medium text-slate-500 mb-2">
                未分组{typeLabel} ({ungroupedSources.length})
              </div>
              <div className="space-y-2">
                {ungroupedSources.map((item) => {
                  const isSelected = selectedSet.has(item.label);
                  return (
                    <div
                      key={item.label}
                      onClick={() => handleUngroupedClick(item)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ 
                            backgroundColor: item.color,
                            opacity: isSelected ? 1 : 0.4 
                          }}
                        />
                        <span className={`text-xs ${isSelected ? 'text-slate-700' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.count}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 添加组按钮 */}
          <button
            type="button"
            onClick={startCreatingGroup}
            disabled={getAvailableSources().length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            新建组
          </button>
        </div>
      )}

      {/* 编辑/创建组弹框 */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && resetEditingState()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? '编辑组' : '新建组'}</DialogTitle>
            <DialogDescription>
              {editingGroup ? '修改组的名称、颜色和包含的' + typeLabel : '创建一个新的' + typeLabel + '组'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 组名输入 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                组名
              </label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入组名"
                className="h-10"
              />
            </div>

            {/* 颜色选择 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                颜色
              </label>
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-slate-300"
                  >
                    <span
                      className="h-6 w-6 rounded-md"
                      style={{ backgroundColor: newGroupColor }}
                    />
                    <span className="text-sm text-slate-600">{newGroupColor}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="start">
                  {/* 颜色板 */}
                  <div className="mb-4">
                    <div className="mb-3 text-sm font-medium text-slate-700">
                      预设颜色
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setNewGroupColor(color);
                            setCustomColorInput(color);
                          }}
                          className={`h-8 w-full rounded-md transition ${
                            newGroupColor === color
                              ? 'ring-2 ring-slate-400 ring-offset-2'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* 自定义颜色输入 */}
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-700">
                      自定义颜色
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={customColorInput}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        placeholder="#2563eb 或 rgb(37, 99, 235)"
                        className="h-10 flex-1"
                      />
                      <div
                        className="h-10 w-10 rounded-md border border-slate-200"
                        style={{
                          backgroundColor: isValidColor(customColorInput)
                            ? customColorInput
                            : 'transparent',
                        }}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* 来源选择 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                选择{typeLabel} ({selectedSourcesForGroup.length} 已选)
              </label>
              <div className="h-80 overflow-y-auto space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                {(() => {
                  const available = getAvailableSources(editingGroup?.id);
                  const availableSet = new Set(available.map((s) => s.label));
                  
                  return sourceItems.map((item) => {
                    const isAvailable = availableSet.has(item.label);
                    const isSelected = selectedSourcesForGroup.includes(item.label);
                    const inOtherGroup = !isAvailable && !isSelected;
                    
                    return (
                      <label
                        key={item.label}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                          inOtherGroup
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            disabled={inOtherGroup}
                            onCheckedChange={() =>
                              !inOtherGroup && toggleSourceSelection(item.label)
                            }
                          />
                          <span className={isSelected ? 'text-slate-700' : 'text-slate-600'}>
                            {item.label}
                          </span>
                        </div>
                        <span className="text-slate-400">{item.count}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetEditingState}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
              disabled={!newGroupName.trim() || selectedSourcesForGroup.length === 0}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              {editingGroup ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 默认模式 - 仅显示原始来源列表 */}
      {mode === 'default' && (
        <div className="space-y-2">
          {sourceItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-xs text-slate-700">{item.label}</span>
              </div>
              <span className="text-xs text-slate-500">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomLegendGroups;
