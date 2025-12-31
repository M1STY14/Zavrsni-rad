import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const VisualizacijaStabla = ({ data }) => {
    const svgRef = useRef(); //referenca na svg element
    //useRef se koristi za pristup DOM elementima bez ponovnog renderiranja komponente
    //useEffect se koristi za izvršavanje efekata nakon renderiranja komponente
    useEffect(() => {
        console.log("Rendering tree with data:", data);
        if (!data) return;

        const svgElement = svgRef.current;
        const { width, height } = svgElement.getBoundingClientRect(); //dohvacanje dimenzija svg elementa

        //ciscenje svg elementa
        d3.select(svgElement).selectAll("*").remove();
        const svg = d3.select(svgElement)
            .attr("width", width)
            .attr("height", height);

        //grupiranje elemenata
        const g = svg.append("g").attr("transform", "translate(50,50)");

        const zoom = d3.zoom()
            .scaleExtent([0.5, 5]) //min 50%, max 500%
            .on("zoom", (event) => {
                g.attr("transform", event.transform); // Apply zoom and pan transformations
            });

        svg.call(zoom) //dodavanje zoom funkcionalnosti

        const root = d3.hierarchy(data);// kreiranje hijerarhijske strukture
        const treeLayout = d3.tree().size([width, height]);// definiranje rasporeda stabla
        const treeData = treeLayout(root);
        console.log(treeData.descendants());
        //dodavanje linija između čvorova
        g.selectAll('line')
            .data(treeData.links())
            .enter()
            .append('line')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', 'black');
        //dodavanje čvorova
        g.selectAll('circle')
            .data(treeData.descendants())
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 20)
            .attr('fill', '#f7931a')
            .on('click', (event, d) => {
                if (d.data && d.data.name) {
                    alert(`Hash: ${d.data.name}`); //prikazivanje hash-a cvorova nakon klika na cvor
                } else {
                    console.error('Node data is undefined or improperly structured:', d);
                    console.log(event);
                }
            });
        //dodavanje teksta u čvorove
        g.selectAll('text')
            .data(treeData.descendants())
            .enter()
            .append('text')
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('dy', -10)
            .attr('text-anchor', 'middle')
            .text(d => d.data.name)
            .attr('font-size', '10px');

    }, [data]); //UseEffect kada se podaci promijene
    return <svg ref={svgRef} style={{ width: "100%", height: "100%", border: "1px solid red" }}></svg>;
};

export default VisualizacijaStabla;