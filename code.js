var canvasWidth = 500;
var canvasHeight = 725;
var graph;

var rectangle = function(r, n) {
    var label = r.text(0, 30, n.label);
    var shape = r.rect(-3*n.label.length, 20, 6*n.label.length, 20)
                 .attr({ "fill": "#FFFFFF" })
                 .attr({ "fill-opacity": 0 });
    
    var set = r.set().push(shape, label);

    if (n.label.slice(n.label.length - 8) == "(hidden)") {
        label.attr("font-size", "0");
        shape.attr("stroke-width", "0");
    }

    return set;
}

var ellipse = function(r, n) {
    var label = r.text(0, 30, n.label);
    var shape = r.ellipse(0, 30, 3*n.label.length, 10)
                 .attr({ "fill": "#FFFFFF" })
                 .attr({ "fill-opacity": 0 });
    
    var set = r.set().push(shape, label);

    if (n.label.slice(n.label.length - 8) == "(hidden)") {
        label.attr("font-size", "0");
        shape.attr("stroke-width", "0");
    }
    
    return set;
}

var blank = function(r, n) {
    var label = r.text(0, 30, n.label);
    var shape = r.ellipse(0, 30, 3*n.label.length, 10)
                 .attr({ "fill": "#FFFFFF" })
                 .attr({ "fill-opacity": 0 });
    
    var set = r.set().push(shape, label);
    label.attr("font-size", "0");

    if (n.label.slice(n.label.length - 8) == "(hidden)") {
        shape.attr("stroke-width", "0");
    }
    
    return set;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createGraph() {
    var lines = readInput();
    graph = new Dracula.Graph();
    
    updateButtonsAndTextfieldsGraph();
    checkTurtle(document.getElementById("rdfInput").value.replaceAll('(hidden)',''))
    createNodesandEdges(lines);

    var layouter = new Dracula.Layout.Spring(graph);
    layouter.layout();

    graph.edges.forEach((e) => {
        e.style['label-style'] = {'fill-opacity': '1'};

        if (e.style.label.slice(e.style.label.length - 8) == "(hidden)") {
            e.style.label = "";
            e.style.stroke = "black; 'stroke-width': 0;";
        }
    });

    document.querySelectorAll('svg').forEach(e => e.remove());

    var renderer = new Dracula.Renderer.Raphael(document.getElementById('canvas'), graph, canvasWidth, canvasHeight);
    renderer.draw();
}

function updateButtonsAndTextfieldsGraph() {
    document.getElementById("buttonCreateGraph").value = "Update graph";
    document.getElementById("buttonCreateLatex").value = "Generate LaTeX";
    document.getElementById("buttonCreateLatex").disabled = false;
    document.getElementById("buttonCopyLatex").style.display = "none";
    document.getElementById("latexOutput").value = "LaTeX Code will be displayed here ...";
    document.getElementById("errorOutput").value = "Errors will be displayed here ...";
}

function checkTurtle(turtle) {
    var parser = new N3.Parser();

    parser.parse(turtle, (error, quad, prefixes) => {
        if (error) {
            document.getElementById("errorOutput").value = "Turtle error:\n" + error.message.replace(" quad", " triple") + "\n\nCreated graph and LaTeX might not be correct!";
        }
    });
}

function readInput() {
    var turtle = document.getElementById("rdfInput").value;
    return turtle.split('\n').map(string => string.slice(0, -1));
}

function createNodesandEdges(lines) {
    var firstNode, edge, secondNode = "";

    for(var i = 0; i < lines.length; i++){
        if (lines[i].trim().length != 0 && lines[i].slice(0, 7) != "@prefix") {
            var [firstNodeTemp, edgeTemp, ...objectNodes] = lines[i].split(/\s+/);
            objectNodes = formatObjectNodes(objectNodes);

            for (var secondNodeTemp of objectNodes) {
                if (firstNodeTemp.trim().length != 0) {
                    firstNode = firstNodeTemp;
                }

                if (edgeTemp.trim().length != 0) {
                    edge = edgeTemp;
                }

                if (secondNodeTemp.trim().length != 0) {
                    secondNode = secondNodeTemp;
                }

                graph.addNode(firstNode, getNodeParameters(firstNode));
                graph.addNode(secondNode, getNodeParameters(secondNode));
                graph.addEdge(firstNode, secondNode, { label: edge, directed: true });
            }
        }
    }
}

function formatObjectNodes(objectNodes) {
    var partOfString = false;
    var nodes = [];

    for (var node of objectNodes) {
        if (node.slice(-1) == ",") {
            node = node.slice(0, -1); 
        }

        if (partOfString) {
            if (node.slice(-1) == "\"" || node.slice(-9) == "\"(hidden)") {
                partOfString = false;
            }

            nodes[nodes.length - 1] = nodes[nodes.length - 1].concat(" ", node);
        } else {
            if (node.slice(0, 1) == "\"") {
                partOfString = true;
            }

            nodes.push(node);
        }
    }

    return nodes;
}

function getNodeParameters(text) {
    if (text.slice(0, 2) == "_:") {
        return { label: text, render: blank };
    } else if (checkIfIsLiteral(text)) {
        return { label: text, render: rectangle };
    } else {
        return { label: text, render: ellipse };
    }
}

function checkIfIsLiteral(text) {
    if (text.match('true|false|(".*")')) {
        return true;
    }

    return !isNaN(parseFloat(text)) && isFinite(text);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createLatex() {
    updateButtonsLatex();

    var latexStart = `\\begin{tikzpicture}[remember picture,overlay,shift=(current page.north west)]
    \\begin{scope}[x={(current page.north east)},y={(current page.south west)}]
        \\newcounter{yShift}\\setcounter{yShift}{0}`;

    var latexNodes = "";
    var latexEdges = "";
    var graphTop = 1;
    var graphBottom = 0;

    for (const [key, value] of Object.entries(graph.nodes)) {
        var newNode = `
        \\node[` 
        + (value.shape["0"].type == "rect" ? "rectangle" : "ellipse") + `, ` 
        + (key.slice(key.length - 8) == "(hidden)" ? "draw=none" : "draw") + `, minimum height=0.9cm, anchor=north west] (`
        + key.replace(/[^0-9a-z]/gi, "") + `) at (` 
        + (value.shape["0"].getBBox().x / canvasWidth).toFixed(4) + `,` 
        + (value.shape["0"].getBBox().y / canvasHeight).toFixed(4) + ` + \\value{yShift} / 100) {` 
        + ((key.slice(key.length - 8) == "(hidden)") || (key.slice(0, 2) == "_:") ? "\\phantom{" + key.replace("_", "") + "}" : key.replace("_", "")) + `};`;

        latexNodes = latexNodes.concat(newNode);
        graphTop = Math.min(graphTop, value.shape["0"].getBBox().y / canvasHeight);
        graphBottom = Math.max(graphBottom, value.shape["0"].getBBox().y / canvasHeight);
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
\\end{tikzpicture}

\\vspace{` + Math.round((graphBottom - graphTop + 40 / canvasHeight) * 297) + `mm}`;

    document.getElementById("latexOutput").value = latexStart + latexNodes + latexEdges + latexEnd;
}

function updateButtonsLatex() {
    document.getElementById("buttonCopyLatex").style.display = "block";
    document.getElementById("buttonCreateLatex").value = "Update LaTeX";
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