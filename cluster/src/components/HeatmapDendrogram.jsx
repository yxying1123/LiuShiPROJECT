import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const HeatmapDendrogram = ({
  heatmap,
  rowTree,
  colTree,
  width = 1200,
  height = 800,
  xLabels = [],
  yLabels = [],
  showTitle = true,
  title = '热图聚类树',
  fontScale = 1,
  fontFamily = 'Noto Sans SC, sans-serif',
  svgRef: externalSvgRef,
  onRendered,
}) => {
  const fallbackRef = useRef(null);
  const svgRef = externalSvgRef ?? fallbackRef;

  const buildFlatTree = (labels) => ({
    name: 'root',
    children: (labels || []).map((label) => ({ name: String(label) })),
  });

  const drawHeatmapWithDendrogram = (
    svg,
    rowTreeData,
    colTreeData,
    values,
    rowLabels,
    colLabels,
    width,
    height,
    xOverride,
    yOverride,
    fontScale,
    fontFamily
  ) => {
    const safeScale = Number.isFinite(fontScale) ? fontScale : 1;
    const axisFontSize = Math.max(10, Math.round(12 * safeScale));
    const legendFontSize = Math.max(10, Math.round(12 * safeScale));
    const margin = {
      top: Math.round(120 * safeScale),
      right: Math.round(120 * safeScale),
      bottom: Math.round(120 * safeScale),
      left: Math.round(120 * safeScale),
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    const dendrogramSize = Math.min(180 * safeScale, innerWidth * 0.32, innerHeight * 0.32);
    const heatmapWidth = innerWidth - dendrogramSize;
    const heatmapHeight = innerHeight - dendrogramSize;
    if (heatmapWidth <= 0 || heatmapHeight <= 0) return;

    const heatmapX = dendrogramSize;
    const heatmapY = dendrogramSize;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const clipIdLeft = `clip-left-${Math.random().toString(36).slice(2)}`;
    const clipIdTop = `clip-top-${Math.random().toString(36).slice(2)}`;

    const defs = svg.append('defs');
    defs
      .append('clipPath')
      .attr('id', clipIdLeft)
      .attr('clipPathUnits', 'userSpaceOnUse')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dendrogramSize)
      .attr('height', heatmapHeight);

    defs
      .append('clipPath')
      .attr('id', clipIdTop)
      .attr('clipPathUnits', 'userSpaceOnUse')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', heatmapWidth)
      .attr('height', dendrogramSize);

    const rootLeft = d3.hierarchy(
      rowTreeData,
      (d) => (d?.children ? d.children : d?.left || d?.right ? [d.left, d.right].filter(Boolean) : null)
    );
    const rootTop = d3.hierarchy(
      colTreeData,
      (d) => (d?.children ? d.children : d?.left || d?.right ? [d.left, d.right].filter(Boolean) : null)
    );

    const layoutTree = (root, leafOrder, primarySize, secondarySize) => {
      const leaves = root.leaves();
      const leafCount = leaves.length || 1;
      const step = primarySize / leafCount;
      const orderMap = new Map();
      (leafOrder || []).forEach((label, index) => {
        orderMap.set(String(label), index);
      });

      leaves.forEach((leaf, index) => {
        const label = String(leaf.data?.name ?? leaf.data?.label ?? '');
        const orderIndex = orderMap.has(label) ? orderMap.get(label) : index;
        leaf.x = (orderIndex + 0.5) * step;
      });

      root.eachAfter((node) => {
        if (node.children && node.children.length > 0) {
          node.x = d3.mean(node.children, (child) => child.x);
        }
      });

      const distances = root
        .descendants()
        .map((node) => Number(node.data?.distance))
        .filter((value) => Number.isFinite(value));
      const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;

      if (maxDistance > 0) {
        root.each((node) => {
          const distance = Number.isFinite(node.data?.distance) ? node.data.distance : 0;
          node.y = secondarySize * (1 - distance / maxDistance);
        });
        return;
      }

      const maxHeight = d3.max(root.descendants(), (node) => node.height) || 1;
      root.each((node) => {
        node.y = secondarySize * (1 - node.height / maxHeight);
      });
    };

    layoutTree(rootLeft, rowLabels, heatmapHeight, dendrogramSize);
    layoutTree(rootTop, colLabels, heatmapWidth, dendrogramSize);

    const leftGroup = g
      .append('g')
      .attr('transform', `translate(0, ${heatmapY})`)
      .attr('clip-path', `url(#${clipIdLeft})`);
    const leftElbow = (link) => {
      const source = link.source;
      const target = link.target;
      return `M${source.y},${source.x}V${target.x}H${target.y}`;
    };
    leftGroup
      .selectAll('.link')
      .data(rootLeft.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', leftElbow)
      .attr('fill', 'none')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', Math.max(1, safeScale));

    const topGroup = g
      .append('g')
      .attr('transform', `translate(${heatmapX}, 0)`)
      .attr('clip-path', `url(#${clipIdTop})`);
    const topElbow = (link) => {
      const source = link.source;
      const target = link.target;
      return `M${source.x},${source.y}H${target.x}V${target.y}`;
    };
    topGroup
      .selectAll('.link')
      .data(rootTop.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', topElbow)
      .attr('fill', 'none')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', Math.max(1, safeScale));

    const rowCount = values.length;
    const colCount = values[0]?.length ?? 0;
    if (rowCount === 0 || colCount === 0) return;

    const heatmapData = [];
    for (let row = 0; row < rowCount; row += 1) {
      for (let col = 0; col < colCount; col += 1) {
        const value = Number(values?.[row]?.[col]);
        heatmapData.push({
          row,
          col,
          value: Number.isFinite(value) ? value : 0,
        });
      }
    }

    const cellWidth = heatmapWidth / colCount;
    const cellHeight = heatmapHeight / rowCount;
    const xScale = d3
      .scaleBand()
      .domain(d3.range(colCount))
      .range([heatmapX, heatmapX + heatmapWidth]);
    const yScale = d3
      .scaleBand()
      .domain(d3.range(rowCount))
      .range([heatmapY, heatmapY + heatmapHeight]);

    const [minValue, maxValue] = d3.extent(heatmapData, (d) => d.value);
    const colorScale = d3
      .scaleSequential(d3.interpolateRdYlBu)
      .domain([maxValue ?? 0, minValue ?? 0]);

    g.selectAll('.heatmap-cell')
      .data(heatmapData)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', (d) => heatmapX + d.col * cellWidth)
      .attr('y', (d) => heatmapY + d.row * cellHeight)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('fill', (d) => colorScale(d.value))
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 0.6);

    const resolvedXLabels =
      Array.isArray(xOverride) && xOverride.length > 0 ? xOverride : colLabels;
    const resolvedYLabels =
      Array.isArray(yOverride) && yOverride.length > 0 ? yOverride : rowLabels;
    // 对于X轴（底部）：列数较少时显示全部，否则均匀采样
    const tickStepX = colCount <= 20 ? 1 : Math.max(1, Math.ceil(colCount / 12));
    // 对于Y轴（右侧）：每个聚类都显示一个序号，确保不丢失聚类号
    const tickStepY = 1;
    const xTickValues =
      Array.isArray(xOverride) && xOverride.length > 0
        ? d3.range(0, Math.min(colCount, resolvedXLabels.length), 1)
        : d3.range(0, colCount, tickStepX);
    // Y轴显示所有聚类序号，每个格子对应一个序号
    const yTickValues = d3.range(0, rowCount, tickStepY);
    const formatXLabel = (index) => resolvedXLabels[index] ?? `#${index + 1}`;
    const formatYLabel = (index) => resolvedYLabels[index] ?? `#${index + 1}`;

    const xAxis = d3.axisBottom(xScale).tickValues(xTickValues).tickFormat(formatXLabel);
    g.append('g')
      .attr('transform', `translate(0, ${heatmapY + heatmapHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', `${axisFontSize}px`)
      .style('font-family', fontFamily)
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-90)')
      .attr('dx', '-0.4em')
      .attr('dy', '0.6em');

    const yAxis = d3.axisRight(yScale).tickValues(yTickValues).tickFormat(formatYLabel);
    const yAxisGroup = g.append('g')
      .attr('transform', `translate(${heatmapX + heatmapWidth}, 0)`)
      .call(yAxis);
    yAxisGroup.selectAll('text')
      .style('font-size', `${axisFontSize}px`)
      .style('font-family', fontFamily)
      .style('text-anchor', 'start')
      .attr('dx', '0.5em')
      .attr('dy', '0.32em');
    // 当聚类数量较多时，缩小字体以避免重叠
    if (rowCount > 30) {
      const adjustedFontSize = Math.max(8, Math.min(axisFontSize, Math.floor(cellHeight * 0.7)));
      yAxisGroup.selectAll('text').style('font-size', `${adjustedFontSize}px`);
    }

    const legendWidth = Math.max(16, Math.round(16 * safeScale));
    const legendHeight = Math.min(Math.round(240 * safeScale), heatmapHeight);
    const legend = g
      .append('g')
      .attr(
        'transform',
        `translate(${heatmapX + heatmapWidth + Math.round(40 * safeScale)}, ${heatmapY})`
      );

    const legendScale = d3
      .scaleLinear()
      .domain(colorScale.domain())
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(5);
    legend
      .append('g')
      .attr('transform', `translate(${legendWidth + Math.round(6 * safeScale)}, 0)`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', `${legendFontSize}px`)
      .style('font-family', fontFamily);

    legend
      .selectAll('rect')
      .data(d3.range(legendHeight))
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => d)
      .attr('width', legendWidth)
      .attr('height', 1)
      .attr('fill', (d) => colorScale(legendScale.invert(d)));

    legend
      .append('text')
      .attr('x', 0)
      .attr('y', legendHeight + Math.round(24 * safeScale))
      .attr('fill', '#374151')
      .attr('font-size', legendFontSize)
      .attr('font-family', fontFamily)
      .text('标准化值');
  };

  useEffect(() => {
    if (!heatmap || !Array.isArray(heatmap.values) || heatmap.values.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rowLabels = (heatmap.rows || []).map((label) => String(label));
    const colLabels = (heatmap.cols || []).map((label) => String(label));
    const values = heatmap.values || [];
    const rowCount = values.length;
    const colCount = values[0]?.length ?? 0;
    if (rowCount === 0 || colCount === 0) return;

    const safeRowTree = rowTree || buildFlatTree(rowLabels);
    const safeColTree = colTree || buildFlatTree(colLabels);

    drawHeatmapWithDendrogram(
      svg,
      safeRowTree,
      safeColTree,
      values,
      rowLabels,
      colLabels,
      width,
      height,
      xLabels,
      yLabels,
      fontScale,
      fontFamily
    );

    if (onRendered) {
      onRendered(svgRef.current);
    }
  }, [heatmap, rowTree, colTree, width, height, xLabels, yLabels, onRendered, svgRef]);

  return (
    <div className="w-full">
      {showTitle && <h3 className="mb-4 text-lg font-semibold text-slate-800">{title}</h3>}
      <div className="overflow-x-auto">
        <div className="flex justify-center">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="rounded-2xl bg-white shadow-sm"
            style={{ minWidth: width, minHeight: height }}
          />
        </div>
      </div>
    </div>
  );
};

export default HeatmapDendrogram;
