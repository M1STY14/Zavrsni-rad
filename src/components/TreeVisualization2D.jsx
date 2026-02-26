import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const TreeVisualization2D = ({ data, proofHighlight, onNodeClick }) => {
    const svgRef = useRef();
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (!data) return;

        const svgElement = svgRef.current;
        const { width, height } = svgElement.getBoundingClientRect();

        d3.select(svgElement).selectAll('*').remove();
        const svg = d3.select(svgElement).attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', 'translate(50,50)');

        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);

        const root = d3.hierarchy(data);
        const treeLayout = d3.tree().size([width - 100, height - 100]);
        const treeData = treeLayout(root);

        const defs = svg.append('defs');

        // Link gradient
        const gradient = defs.append('linearGradient')
            .attr('id', 'link-gradient')
            .attr('gradientUnits', 'userSpaceOnUse');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.3);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#667eea').attr('stop-opacity', 0.5);

        // Proof path link gradient
        const proofGradient = defs.append('linearGradient')
            .attr('id', 'proof-link-gradient')
            .attr('gradientUnits', 'userSpaceOnUse');
        proofGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffa726').attr('stop-opacity', 0.8);
        proofGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ff7043').attr('stop-opacity', 0.9);

        // Glow filter
        const filter = defs.append('filter').attr('id', 'glow');
        filter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Proof glow filter (stronger)
        const proofFilter = defs.append('filter').attr('id', 'proof-glow');
        proofFilter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');
        const proofMerge = proofFilter.append('feMerge');
        proofMerge.append('feMergeNode').attr('in', 'coloredBlur');
        proofMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const isOnPath = (hash) => proofHighlight?.pathHashes?.has(hash);
        const isSibling = (hash) => proofHighlight?.siblingHashes?.has(hash);
        const isSelected = (hash) => proofHighlight?.selectedLeaf === hash;

        // Check if a link is on the proof path (both source and target on path)
        const isLinkOnPath = (d) => {
            return isOnPath(d.source.data.name) && isOnPath(d.target.data.name);
        };

        // Links
        g.selectAll('path.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d => {
                return `M${d.source.x},${d.source.y}
                        C${d.source.x},${(d.source.y + d.target.y) / 2}
                         ${d.target.x},${(d.source.y + d.target.y) / 2}
                         ${d.target.x},${d.target.y}`;
            })
            .attr('fill', 'none')
            .attr('stroke', d => isLinkOnPath(d) ? 'url(#proof-link-gradient)' : 'url(#link-gradient)')
            .attr('stroke-width', d => isLinkOnPath(d) ? 4 : 2)
            .style('opacity', 0)
            .transition()
            .duration(800)
            .style('opacity', 1);

        // Nodes
        const nodes = g.selectAll('g.node')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        function getNodeColor(d) {
            const hash = d.data.name;
            if (isSelected(hash)) return '#ff6f00';
            if (isOnPath(hash)) return '#ffa726';
            if (isSibling(hash)) return '#66bb6a';
            const colors = ['#00d4ff', '#00b8e6', '#667eea', '#764ba2'];
            return colors[Math.min(d.depth, colors.length - 1)];
        }

        function getNodeRadius(d) {
            const hash = d.data.name;
            if (isSelected(hash)) return 30;
            if (isOnPath(hash) || isSibling(hash)) return 28;
            return 25;
        }

        nodes.append('circle')
            .attr('r', 0)
            .attr('fill', getNodeColor)
            .attr('stroke', d => {
                const hash = d.data.name;
                if (isSelected(hash)) return '#ff6f00';
                if (isOnPath(hash)) return '#ffcc02';
                if (isSibling(hash)) return '#a5d6a7';
                return '#fff';
            })
            .attr('stroke-width', d => (isOnPath(d.data.name) || isSibling(d.data.name)) ? 4 : 3)
            .style('cursor', 'pointer')
            .style('filter', d => (isOnPath(d.data.name) || isSelected(d.data.name)) ? 'url(#proof-glow)' : 'url(#glow)')
            .on('mouseenter', function (event, d) {
                d3.select(this).transition().duration(200).attr('r', getNodeRadius(d) + 7).attr('stroke-width', 4);
                setTooltip({ visible: true, x: event.pageX, y: event.pageY, text: d.data.name || 'No hash' });
            })
            .on('mouseleave', function (event, d) {
                d3.select(this).transition().duration(200).attr('r', getNodeRadius(d)).attr('stroke-width', 3);
                setTooltip(prev => ({ ...prev, visible: false }));
            })
            .on('click', (event, d) => {
                if (d.data && d.data.name) {
                    navigator.clipboard.writeText(d.data.name);
                    setNotification(d.data.name);
                    setTimeout(() => setNotification(null), 2000);
                    onNodeClick?.(d.data.name);
                }
            })
            .transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('r', getNodeRadius);

        // Labels
        nodes.append('text')
            .attr('dy', -35)
            .attr('text-anchor', 'middle')
            .text(d => {
                const hash = d.data.name || '';
                return hash.length > 8 ? hash.substring(0, 8) + '...' : hash;
            })
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#333')
            .style('opacity', 0)
            .transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .style('opacity', 1);

    }, [data, proofHighlight]);

    return (
        <>
            <svg ref={svgRef} style={{ width: '100%', height: '100%', background: 'transparent' }} />

            {tooltip.visible && (
                <div style={{
                    position: 'fixed',
                    left: tooltip.x + 10,
                    top: tooltip.y + 10,
                    background: 'rgba(0, 0, 0, 0.9)',
                    color: '#00d4ff',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    maxWidth: '300px',
                    wordBreak: 'break-all',
                    pointerEvents: 'none',
                    zIndex: 10000,
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                }}>
                    {tooltip.text}
                </div>
            )}

            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0, 212, 255, 0.15)',
                    border: '2px solid rgba(0, 212, 255, 0.4)',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    color: '#00d4ff',
                    fontSize: '0.9rem',
                    zIndex: 10000,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}>
                    Hash copied to clipboard
                </div>
            )}
        </>
    );
};

export default TreeVisualization2D;
