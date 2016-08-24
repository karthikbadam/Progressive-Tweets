/**
 * Created by karthik on 8/3/16.
 */

function Scatter(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "content-right";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    Feedback.addControlMinimize(parentDiv, _self);

    var margin = _self.margin = {
            top: 5,
            right: 5,
            bottom: 40,
            left: 5
        },
        width = $("#" + contentDiv).width() - margin.left - margin.right,
        height = $("#" + contentDiv).height() - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var svg = _self.svg = d3.select("#" + contentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = _self.x = d3.scaleLinear()
        .range([0, width]);

    var y = _self.y = d3.scaleLinear()
        .range([height, 0]);

    _self.data = null;

    _self.brush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on("end", function () {
            if (d3.event.selection != null) {
                var xSelection = [d3.event.selection[0][0], d3.event.selection[1][0]];
                var ySelection = [d3.event.selection[0][1], d3.event.selection[1][1]];

                _self.rectWidth = d3.event.selection[1][0] - d3.event.selection[0][0];
                _self.rectHeight = d3.event.selection[1][1] - d3.event.selection[0][1];

                _self.rectLeft = d3.event.selection[0][0] + _self.margin.left;
                _self.rectTop = d3.event.selection[0][1] + _self.margin.top;

                var xdomain = xSelection.map(_self.x.invert).sort(function (a, b) {
                    return a - b;
                });

                var ydomain = ySelection.map(_self.y.invert).sort(function (a, b) {
                    return a - b;
                });

                if (_self.data) {
                    var ids = [];
                    var brushed = _self.data.filter(function (d) {
                        if (d["content"][0] >= xdomain[0] && d["content"][0] <= xdomain[1]) {
                            if (d["content"][1] >= ydomain[0] && d["content"][1] <= ydomain[1]) {
                                ids.push(+d["id"]);
                                _self.svg.select("#l" + d["id"]).attr("r", 6);
                                return true;
                            } else {
                                _self.svg.select("#l" + d["id"]).attr("r", 3);
                                return false;
                            }
                        } else {
                            _self.svg.select("#l" + d["id"]).attr("r", 3);
                            return false;
                        }
                    });

                    console.log(ids);


                    //sending ids to the server
                    socket.send(wrapMessage("request keywords", {content: ids, chunkSize: 30}));
                }
            }
        });

    _self.svg.append("g")
        .attr("class", "brush")
        .call(_self.brush);

    _self.t = d3.transition()
        .duration(200)
        .ease(d3.easeLinear);
}

Scatter.prototype.draw = function (data) {

    var _self = this;

    _self.data = data["content"];

    var progress = data["absolute-progress"];

    _self.progressCurrentDiv.style("width", Math.round(progress["current"] * 100 / progress["total"]) + "%")
    _self.progressTotalDiv.style("width", 100 - Math.round(progress["current"] * 100 / progress["total"]) + "%")
    _self.progressCurrentDiv.select("span").text(Math.round(progress["current"]));
    _self.progressTotalDiv.select("span").text(Math.round(progress["total"]));

    _self.x.domain(d3.extent(_self.data, function (d) {
        return d["content"][0];
    }));

    _self.y.domain(d3.extent(_self.data, function (d) {
        return d["content"][1];
    }));

    // draw dots
    var circles = _self.circles = _self.svg.selectAll(".dot")
        .data(_self.data, function (d, i) {
            return d["id"];
        });

    circles.enter()
        .append("circle")
        .transition()
        .duration(200)
        .attr("id", function (d, i) {
            return "l" + d["id"];
        })
        .attr("class", "dot")
        .attr("r", 3)
        .attr("cx", function (d) {
            return _self.x(d["content"][0]);
        })
        .attr("cy", function (d) {
            return _self.y(d["content"][1]);
        })
        .style("fill", function (d, i) {
            if (isNaN(sentiments[i])) {
                return "rgb(" + colors[sentiments[3]] + ")";
            }
            return "rgb(" + colors[sentiments[i]] + ")";
        })
        .style("stroke", function (d) {
            return "#222";
        })
        .style("fill-opacity", 0.75);

    circles.exit()
        .remove();

    circles
        .transition(_self.t)
        .attr("cx", function (d) {
            return _self.x(d["content"][0]);
        })
        .attr("cy", function (d) {
            return _self.y(d["content"][1]);
        });
}

Scatter.prototype.drawKeywords = function (allKeywords) {

    var _self = this;

    _self.popularKeywords = d3.map();

    // counting keywords
    allKeywords.forEach(function (keyword) {

        if (_self.popularKeywords.has(keyword)) {

            _self.popularKeywords.set(keyword, _self.popularKeywords.get(keyword) + 1);

        } else {

            _self.popularKeywords.set(keyword, 1);
        }

    });


    _self.popularKeywords = _self.popularKeywords.entries().sort(function (a, b) {
        return b.value - a.value;
    }).slice(0, 15);

    console.log(_self.popularKeywords);


    d3.select("#keywordDiv").remove();

    _self.keywordDiv = d3.select('#' + _self.contentDiv).append("div")
        .attr("id", "keywordDiv")
        .style("background-color", "transparent")
        .style("height", _self.rectHeight + "px")
        .style("width", _self.rectWidth + "px")
        .style("display", "inline-block")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("left", _self.rectLeft + "px")
        .style("top", _self.rectTop + "px");

    _self.keywordDefaultSize = 150;
    _self.keywordbar = new KeywordBar("keywordDiv", _self.popularKeywords,
        _self.rectWidth > _self.keywordDefaultSize / 2 ? _self.rectWidth : _self.keywordDefaultSize / 2,
        _self.rectHeight > _self.keywordDefaultSize ? _self.rectHeight : _self.keywordDefaultSize);

}

function KeywordBar(parentDiv, data, rectWidth, rectHeight) {

    var _self = this;

    var margin = {
            top: 2,
            right: 2,
            bottom: 2,
            left: 2
        },
        width = rectWidth - margin.left - margin.right,
        height = rectHeight - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var y = _self.y = d3.scaleBand()
        .range([height, 0])
        .paddingOuter(0.)
        .paddingInner(0.);

    var x = _self.x = d3.scaleLinear()
        .range([0, width]);

    _self.highest = 5;

    var svg = _self.svg = d3.select("#" + parentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "transparent")
        .style("pointer-events", "none")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    _self.y.domain(data.map(function (d) {
        return d.key;
    }).reverse());

    _self.x.domain([0, d3.max(data, function (d) {
        return d.value;
    })]);

    var selection = _self.svg.selectAll(".bar")
        .data(data);

    selection.enter()
        .append("rect")
        .transition().duration(10)
        .attr("class", "bar")
        .attr("y", function (d, i) {

            return _self.y(d.key);
        })
        .attr("height", _self.y.bandwidth())
        .attr("x", function (d) {
            return 0;
        })
        .attr("width", function (d) {
            return _self.x(d.value);
        })
        .style("fill", function (d, i) {
            return "#EEE";
        })
        .style("stroke", function (d, i) {
            return "#888";
        })
        .style("fill-opacity", 0.8);

    selection.transition().duration(10)
        .attr("y", function (d, i) {
            return _self.y(d.key);
        })
        .attr("height", _self.y.bandwidth())
        .attr("x", function (d) {
            return 0;
        })
        .attr("width", function (d) {
            return _self.x(d.value);
        })
        .style("fill", function (d, i) {
            return "#EEE";
        })
        .style("stroke", function (d, i) {
            return "#888";
        })
        .style("fill-opacity", 0.8);

    selection.exit().transition().duration(10).remove();

    var annotation = _self.svg.selectAll(".annotation")
        .data(data);

    annotation.enter()
        .append("text")
        .transition().duration(10)
        .attr("class", "annotation")
        .attr("y", function (d, i) {
            return _self.y(d.key) + _self.y.bandwidth() / 2;
        })
        .attr("x", function (d) {
            return 3;
        })
        .attr("fill", function (d, i) {
            return "#222";
        })
        .attr("font-size", "9px")
        .text(function (d, i) {
            return d.key + " (" + d.value + ")";
        })
        .attr("dominant-baseline", "middle");

    annotation.transition().duration(10)
        .attr("y", function (d, i) {
            return _self.y(d.key) + _self.y.bandwidth() / 2;
        })
        .attr("x", function (d) {
            return 3;
        })
        .attr("fill", function (d, i) {
            return "#222";
        })
        .attr("font-size", "9px")
        .style("fill-opacity", 1)
        .text(function (d, i) {
            return d.key + " (" + d.value + ")";
        })
        .attr("dominant-baseline", "middle");

    annotation.exit().transition().duration(10).remove();
}




