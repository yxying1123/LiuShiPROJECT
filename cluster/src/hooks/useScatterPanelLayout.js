import { useState, useLayoutEffect, useRef } from 'react';

const MIN_SCATTER_HEIGHT = 520;

/**
 * 热图页面散点图面板布局 Hook
 */
export const useScatterPanelLayout = () => {
  const [scatterPlotHeight, setScatterPlotHeight] = useState(560);
  const [scatterAreaHeight, setScatterAreaHeight] = useState(560);
  const [scatterAreaNode, setScatterAreaNode] = useState(null);

  const scatterHeightLockedRef = useRef(false);

  useLayoutEffect(() => {
    if (!scatterAreaNode) return undefined;

    scatterHeightLockedRef.current = false;

    const updateHeight = () => {
      if (scatterHeightLockedRef.current) return;
      const rect = scatterAreaNode.getBoundingClientRect();
      const nextHeight = Math.max(MIN_SCATTER_HEIGHT, Math.floor(window.innerHeight - rect.top - 20));
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      setScatterAreaHeight(nextHeight);
      setScatterPlotHeight(nextHeight);
      scatterHeightLockedRef.current = true;
    };

    let frame1 = null;
    let frame2 = null;

    const scheduleUpdate = () => {
      if (frame1) cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      frame1 = requestAnimationFrame(() => {
        updateHeight();
        frame2 = requestAnimationFrame(updateHeight);
      });
    };

    scheduleUpdate();

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(scatterAreaNode);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frame1) cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [scatterAreaNode]);

  return {
    scatterPlotHeight,
    setScatterPlotHeight,
    scatterAreaHeight,
    setScatterAreaHeight,
    scatterAreaNode,
    setScatterAreaNode,
  };
};
