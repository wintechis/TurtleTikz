var canvasWidth = 500;
var canvasHeight = 725;
var graph;

//TODO: Kreis für Blank Nodes

var rectangle = function(r, n) {
    var label = r.text(0, 30, n.label)
    var shape = r.rect(-3*n.label.length, 20, 6*n.label.length, 20)
                 .attr({ "fill": "#FFFFFF" })
                 .attr({ "fill-opacity": 0 })
    
    var set = r.set()
    .push(shape, label)

    if (n.label.slice(n.label.length - 3) == "(u)") {
        label.attr("font-size", "0")
        shape.attr("stroke-width", "0")
    }

    return set
}

var ellipse = function(r, n) {
    var label = r.text(0, 30, n.label);
    var shape = r.ellipse(0, 30, 3*n.label.length, 10)
                 .attr({ "fill": "#FFFFFF" })
                 .attr({ "fill-opacity": 0 })
    
    var set = r.set().push(shape, label)

    if (n.label.slice(n.label.length - 3) == "(u)") {
        label.attr("font-size", "0")
        shape.attr("stroke-width", "0")
    }
    
    return set
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createGraph() {
    document.getElementById("buttonCreateGraph").value = "Update graph";
    document.getElementById("buttonCreateLatex").value = "Generate LaTeX";
    document.getElementById("buttonCreateLatex").disabled = false;
    document.getElementById("buttonCopyLatex").disabled = true;
    document.getElementById("latexOutput").value = "LaTeX Code will be displayed here ...";

    graph = new Dracula.Graph();
    var lines = readInput();

    createNodesandEdges(lines);

    var layouter = new Dracula.Layout.Spring(graph);
    layouter.layout();

    graph.edges.forEach((e) => {
        e.style['label-style'] = {'fill-opacity': '1'};

        if (e.style.label.slice(e.style.label.length - 3) == "(u)") {
            e.style.label = "";
            e.style.stroke = "black; 'stroke-width': 0;";
        }
    });

    document.querySelectorAll('svg').forEach(e => e.remove());

    var renderer = new Dracula.Renderer.Raphael(document.getElementById('canvas'), graph, canvasWidth, canvasHeight);
    renderer.draw();
}

function readInput() {
    var turtle = document.getElementById("rdfInput").value;
    return turtle.split('\n');
}

function createNodesandEdges(lines) {
    var firstNode, edge, secondNode = "";

    for(var i = 0; i < lines.length; i++){
        if (lines[i].trim().length != 0 && lines[i].slice(0, 7) != "@prefix") {
            var [firstNodeTemp, edgeTemp, ...secondNodeTemp] = lines[i].split(/\s+/);
            secondNodeTemp = secondNodeTemp.join(" ")

            if (firstNodeTemp.trim().length != 0) {
                firstNode = firstNodeTemp;
            }

            if (edgeTemp.trim().length != 0) {
                edge = edgeTemp;
            }

            if (secondNodeTemp.trim().length != 0) {
                secondNode = secondNodeTemp;
            }

            graph.addNode(firstNode, { label: firstNode, render: firstNode.slice(0, 1) == "\"" ? rectangle : ellipse })
            graph.addNode(secondNode, { label: secondNode, render: secondNode.slice(0, 1) == "\"" ? rectangle : ellipse })
            graph.addEdge(firstNode, secondNode, { label: edge, directed: true });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createLatex() {
    document.getElementById("buttonCopyLatex").disabled = false;
    document.getElementById("buttonCreateLatex").value = "Update LaTeX";

    var latexStart = `\\begin{tikzpicture}[remember picture,overlay,shift=(current page.north west)]
    \\begin{scope}[x={(current page.north east)},y={(current page.south west)}]
        \\newcounter{yShift}\\setcounter{yShift}{0}`;

    var latexNodes = "";
    var latexEdges = "";

    for (const [key, value] of Object.entries(graph.nodes)) {
        var newNode = `
        \\node[` 
        + (value.shape["0"].type == "rect" ? "rectangle" : "ellipse") + `, ` 
        + (key.slice(key.length - 3) == "(u)" ? "draw=none" : "draw") + `, minimum height=0.9cm, anchor=north west] (`
        + key.replace(/[^0-9a-z]/gi, '') + `) at (` 
        + (value.shape["0"].getBBox().x / canvasWidth).toFixed(4) + `,` 
        + (value.shape["0"].getBBox().y / canvasHeight).toFixed(4) + ` + \\value{yShift} / 100) {` 
        + (key.slice(key.length - 3) == "(u)" ? "\\phantom{" + key + "}" : key) + `};`;

        latexNodes = latexNodes.concat(newNode);
    }

    for (const [key, value] of Object.entries(graph.edges)) {
        if (value.style.label != "") {
            var newEdge = `
        \\draw (`
            + value.source.label.replace(/[^0-9a-z]/gi, '')
            + `) edge[out=`
            + getDirection(value.source, value.shape.fg.attrs.path["0"]) + `,in=`
            + getDirection(value.target, value.shape.fg.attrs.path["4"]) + `,-{Latex[scale=1.5]}] node [fill=white] {`
            + value.style.label + `} (`
            + value.target.label.replace(/[^0-9a-z]/gi, '') + `);`;

            latexEdges = latexEdges.concat(newEdge);
        }
    }
        
    var latexEnd = `
    \\end{scope}
\\end{tikzpicture}`;

    document.getElementById("latexOutput").value = latexStart + latexNodes + latexEdges + latexEnd;
}

function getDirection(node, path) {
    if (Math.abs(path[1] - node.shape["0"].getBBox().x) < 10) {
        return "180";
    }

    if (Math.abs(path[1] - node.shape["0"].getBBox().x) > node.label.length * 6 - 10) {
        return "0";
    }

    if (Math.abs(path[2] - node.shape["0"].getBBox().y) < 10) {
        return "90";
    }

    return "270";
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function copyLatex() {
    var textarea = document.getElementById("latexOutput");
    textarea.select();
    document.execCommand("copy");
}