import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import HeatmapDendrogram from '../HeatmapDendrogram';

/**
 * 热图标签页组件
 */
const HeatmapTab = ({ heatmapPayload, heatmapSize, rootFontSize }) => {
  const heatmapSvgRef = useRef(null);

  const handleDownloadImage = () => {
    if (!heatmapSvgRef.current) return;

    const svgElement = heatmapSvgRef.current;
    const bbox = svgElement.getBoundingClientRect();
    const width =
      Number(svgElement.getAttribute('width')) ||
      svgElement.clientWidth ||
      Math.round(bbox.width) ||
      1200;
    const height =
      Number(svgElement.getAttribute('height')) ||
      svgElement.clientHeight ||
      Math.round(bbox.height) ||
      800;
    const fontScale = rootFontSize / 16;

    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('style', 'background: #ffffff');

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const scale = Math.max(window.devicePixelRatio || 1, 2) * Math.max(1, fontScale);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
        link.download = `heatmap-cluster-${timestamp}.png`;
        link.href = pngUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };
    image.decoding = 'async';
    image.src = svgUrl;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="text-sm text-slate-600">热图聚类树</div>
        <button
          type="button"
          onClick={handleDownloadImage}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          下载热图图片
        </button>
      </div>
      <div className="mt-3 rounded-2xl bg-white/90 p-5 shadow-sm">
        <HeatmapDendrogram
          heatmap={heatmapPayload?.heatmap}
          rowTree={heatmapPayload?.rowTree}
          colTree={heatmapPayload?.colTree}
          width={heatmapSize.width}
          height={heatmapSize.height}
          svgRef={heatmapSvgRef}
          showTitle={false}
          fontScale={Math.max(1, rootFontSize / 16)}
        />
      </div>
    </>
  );
};

export default HeatmapTab;
