import { useState, useLayoutEffect, useEffect, useRef } from 'react';

/**
 * 热图页面布局管理 Hook
 */
export const useHeatmapLayout = () => {
  const [heatmapSize, setHeatmapSize] = useState({ width: 1200, height: 800 });
  const [rootFontSize, setRootFontSize] = useState(() => {
    if (typeof window === 'undefined') return 16;
    return Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  });

  const heatmapContainerRef = useRef(null);

  // 监听根字体大小变化
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateRootFont = () => {
      const next =
        Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      setRootFontSize(next);
    };

    updateRootFont();
    window.addEventListener('resize', updateRootFont);

    const observer = new MutationObserver(updateRootFont);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => {
      window.removeEventListener('resize', updateRootFont);
      observer.disconnect();
    };
  }, []);

  // 热图容器尺寸调整
  useLayoutEffect(() => {
    const node = heatmapContainerRef.current;
    if (!node) return undefined;

    const updateSize = () => {
      const containerWidth = node.clientWidth || 1200;
      const scale = Math.max(1, rootFontSize / 16);
      const maxWidth = Math.max(480, window.innerWidth - 120);
      const maxHeight = Math.max(320, window.innerHeight - 320);
      const width = Math.min(Math.floor(containerWidth * 0.95), maxWidth);
      const height = Math.min(Math.floor(width * 0.65 * scale), maxHeight);
      setHeatmapSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, [rootFontSize]);

  return {
    heatmapSize,
    rootFontSize,
    heatmapContainerRef,
  };
};
