import { useState, useEffect, useCallback } from 'react';
import { clampValue } from '../utils/dataHelpers';

const MIN_SCATTER_WIDTH = 520;
const MIN_SCATTER_HEIGHT = 420;
const SCATTER_RESIZE_EDGE = 16;

/**
 * 散点图尺寸管理 Hook
 * 处理自定义尺寸设置和拖拽调整
 */
export const useScatterSize = (scatterPanelWidth, scatterPanelHeight) => {
  const [scatterPointSize, setScatterPointSize] = useState(4.5);
  const [scatterSizeMode, setScatterSizeMode] = useState('auto');
  const [scatterCustomWidth, setScatterCustomWidth] = useState(960);
  const [scatterCustomHeight, setScatterCustomHeight] = useState(560);
  const [scatterWidthInput, setScatterWidthInput] = useState('960');
  const [scatterHeightInput, setScatterHeightInput] = useState('560');
  const [isWidthEditing, setIsWidthEditing] = useState(false);
  const [isHeightEditing, setIsHeightEditing] = useState(false);
  const [isResizeHover, setIsResizeHover] = useState(false);

  const isCustomSize = scatterSizeMode === 'custom';
  const resolvedScatterHeight = isCustomSize ? scatterCustomHeight : scatterPanelHeight;
  const resolvedScatterWidth = isCustomSize ? scatterCustomWidth : scatterPanelWidth;

  // 当非自定义模式时，同步面板尺寸
  useEffect(() => {
    if (!isCustomSize) return;
    setScatterCustomWidth((prev) =>
      clampValue(prev, MIN_SCATTER_WIDTH, scatterPanelWidth || prev)
    );
    setScatterCustomHeight((prev) =>
      clampValue(prev, MIN_SCATTER_HEIGHT, scatterPanelHeight || prev)
    );
  }, [isCustomSize, scatterPanelHeight, scatterPanelWidth]);

  // 同步输入框值
  useEffect(() => {
    if (!isCustomSize) return;
    if (!isWidthEditing) {
      setScatterWidthInput(String(scatterCustomWidth));
    }
  }, [isCustomSize, isWidthEditing, scatterCustomWidth]);

  useEffect(() => {
    if (!isCustomSize) return;
    if (!isHeightEditing) {
      setScatterHeightInput(String(scatterCustomHeight));
    }
  }, [isCustomSize, isHeightEditing, scatterCustomHeight]);

  const handleScatterSizeToggle = useCallback(
    (checked) => {
      if (checked) {
        const nextWidth = clampValue(
          scatterCustomWidth || scatterPanelWidth,
          MIN_SCATTER_WIDTH,
          scatterPanelWidth || scatterCustomWidth
        );
        const nextHeight = clampValue(
          scatterCustomHeight || scatterPanelHeight,
          MIN_SCATTER_HEIGHT,
          scatterPanelHeight || scatterCustomHeight
        );
        setScatterCustomWidth(nextWidth);
        setScatterCustomHeight(nextHeight);
        setScatterWidthInput(String(nextWidth));
        setScatterHeightInput(String(nextHeight));
        setScatterSizeMode('custom');
        return;
      }
      setScatterSizeMode('auto');
    },
    [scatterCustomHeight, scatterCustomWidth, scatterPanelHeight, scatterPanelWidth]
  );

  const applyScatterWidthInput = useCallback(() => {
    const parsed = Number.parseInt(scatterWidthInput, 10);
    if (!Number.isFinite(parsed)) {
      setScatterWidthInput(String(scatterCustomWidth));
      return;
    }
    const next = clampValue(parsed, MIN_SCATTER_WIDTH, scatterPanelWidth || parsed);
    setScatterCustomWidth(next);
    setScatterWidthInput(String(next));
  }, [scatterCustomWidth, scatterPanelWidth, scatterWidthInput]);

  const applyScatterHeightInput = useCallback(() => {
    const parsed = Number.parseInt(scatterHeightInput, 10);
    if (!Number.isFinite(parsed)) {
      setScatterHeightInput(String(scatterCustomHeight));
      return;
    }
    const next = clampValue(parsed, MIN_SCATTER_HEIGHT, scatterPanelHeight || parsed);
    setScatterCustomHeight(next);
    setScatterHeightInput(String(next));
  }, [scatterCustomHeight, scatterHeightInput, scatterPanelHeight]);

  const handleScatterWidthChange = useCallback((event) => {
    setScatterWidthInput(event.target.value);
  }, []);

  const handleScatterHeightChange = useCallback((event) => {
    setScatterHeightInput(event.target.value);
  }, []);

  const handleScatterResizeStart = useCallback(
    (event) => {
      if (!isCustomSize) return;
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = scatterCustomWidth;
      const startHeight = scatterCustomHeight;
      const maxWidth = scatterPanelWidth || startWidth;
      const maxHeight = scatterPanelHeight || startHeight;

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';

      const handleMove = (moveEvent) => {
        const nextWidth = clampValue(
          startWidth + (moveEvent.clientX - startX),
          MIN_SCATTER_WIDTH,
          maxWidth
        );
        const nextHeight = clampValue(
          startHeight + (moveEvent.clientY - startY),
          MIN_SCATTER_HEIGHT,
          maxHeight
        );
        setScatterCustomWidth(nextWidth);
        setScatterCustomHeight(nextHeight);
      };

      const handleUp = () => {
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [isCustomSize, scatterCustomHeight, scatterCustomWidth, scatterPanelHeight, scatterPanelWidth]
  );

  const handleScatterEdgePointerMove = useCallback(
    (event) => {
      if (!isCustomSize) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const nearRight = rect.right - event.clientX <= SCATTER_RESIZE_EDGE;
      const nearBottom = rect.bottom - event.clientY <= SCATTER_RESIZE_EDGE;
      const nextHover = nearRight && nearBottom;
      if (nextHover !== isResizeHover) {
        setIsResizeHover(nextHover);
      }
    },
    [isCustomSize, isResizeHover]
  );

  return {
    // 点大小
    scatterPointSize,
    setScatterPointSize,
    // 尺寸模式
    scatterSizeMode,
    isCustomSize,
    handleScatterSizeToggle,
    // 自定义尺寸
    scatterCustomWidth,
    scatterCustomHeight,
    resolvedScatterWidth,
    resolvedScatterHeight,
    // 输入框
    scatterWidthInput,
    scatterHeightInput,
    isWidthEditing,
    setIsWidthEditing,
    isHeightEditing,
    setIsHeightEditing,
    handleScatterWidthChange,
    handleScatterHeightChange,
    applyScatterWidthInput,
    applyScatterHeightInput,
    // 拖拽调整
    isResizeHover,
    handleScatterResizeStart,
    handleScatterEdgePointerMove,
  };
};
