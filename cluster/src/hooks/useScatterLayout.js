import { useState, useLayoutEffect, useCallback, useRef } from 'react';

const MIN_SCATTER_WIDTH = 520;
const MIN_SCATTER_HEIGHT = 420;

/**
 * 散点图页面布局管理 Hook
 * 处理分析区域和散点图面板的高度/宽度计算
 */
export const useScatterLayout = () => {
  const [analysisAreaHeight, setAnalysisAreaHeight] = useState(() => {
    if (typeof window === 'undefined') return 720;
    return Math.max(520, Math.floor(window.innerHeight * 0.75));
  });

  const [analysisAreaNode, setAnalysisAreaNode] = useState(null);
  const [scatterPanelWidth, setScatterPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 960;
    return Math.max(MIN_SCATTER_WIDTH, Math.floor(window.innerWidth * 0.6));
  });

  const [scatterPanelHeight, setScatterPanelHeight] = useState(() => {
    if (typeof window === 'undefined') return 560;
    return Math.max(MIN_SCATTER_HEIGHT, Math.floor(window.innerHeight * 0.6));
  });

  const [scatterPanelNode, setScatterPanelNode] = useState(null);
  const [analysisAreaReady, setAnalysisAreaReady] = useState(false);
  const [scatterPanelReady, setScatterPanelReady] = useState(false);

  // 分析区域高度调整
  useLayoutEffect(() => {
    if (!analysisAreaNode) return undefined;

    const updateHeight = () => {
      const rect = analysisAreaNode.getBoundingClientRect();
      const nextHeight = Math.max(520, Math.floor(window.innerHeight - rect.top - 20));
      setAnalysisAreaHeight(nextHeight);
    };

    updateHeight();
    setAnalysisAreaReady(true);
    window.addEventListener('resize', updateHeight);

    return () => window.removeEventListener('resize', updateHeight);
  }, [analysisAreaNode]);

  // 散点图面板尺寸调整
  useLayoutEffect(() => {
    if (!scatterPanelNode) return undefined;

    const updateSize = () => {
      const styles = window.getComputedStyle(scatterPanelNode);
      const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;

      const innerHeight = (scatterPanelNode.clientHeight || 0) - paddingTop - paddingBottom;
      const innerWidth = (scatterPanelNode.clientWidth || 0) - paddingLeft - paddingRight;

      setScatterPanelHeight(Math.max(MIN_SCATTER_HEIGHT, Math.floor(innerHeight)));
      setScatterPanelWidth(Math.max(MIN_SCATTER_WIDTH, Math.floor(innerWidth)));
    };

    updateSize();
    setScatterPanelReady(true);

    const observer = new ResizeObserver(updateSize);
    observer.observe(scatterPanelNode);

    return () => observer.disconnect();
  }, [scatterPanelNode]);

  const layoutReady = analysisAreaReady && scatterPanelReady;

  return {
    // 高度/宽度
    analysisAreaHeight,
    scatterPanelWidth,
    scatterPanelHeight,
    // 节点引用
    analysisAreaNode,
    setAnalysisAreaNode,
    scatterPanelNode,
    setScatterPanelNode,
    // 状态
    layoutReady,
  };
};
