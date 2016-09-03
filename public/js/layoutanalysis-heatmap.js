/**
 * Created by karthik on 8/26/16.
 */

function Heatmap(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "content-right";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    var optionHandlers = _self.optionHandlers = {};

    _self.stopFlag = false;
    _self.pauseFlag = false;

    optionHandlers["stop"] = function () {

        if (_self.stopFlag == false) {

            _self.stopFlag = true;

        } else {

            _self.stopFlag = false;

        }

    }

    optionHandlers["pause"] = function () {

        if (_self.pauseFlag == false) {

            _self.pauseFlag = true;

        } else {

            _self.pauseFlag = false;

        }

    }

    optionHandlers["play"] = function () {

        _self.pauseFlag = false;
        _self.stopFlag = false;

    }

    optionHandlers["rewind"] = function () {

    }

    optionHandlers["forward"] = function () {

    }


    Feedback.addControlMinimize(parentDiv, _self, optionHandlers);

    var margin = _self.margin = {
            top: 25,
            right: 5,
            bottom: 25,
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

    // var x = _self.x = d3.scaleLinear()
    //     .range([0, width]);
    //
    // var y = _self.y = d3.scaleLinear()
    //     .range([height, 0]);

    _self.data = null;

    _self.bin2DRows = 40;
    _self.bin2DCols = 40;

    _self.heatmapColorScale = d3.scaleLinear()
        .range(["#deebf7", "#08306b"]);

    // _self.brush = d3.brush()
    //     .extent([[0, 0], [width, height]])
    //     .on("end", function () {
    //         if (d3.event.selection != null) {
    //             var xSelection = [d3.event.selection[0][0], d3.event.selection[1][0]];
    //             var ySelection = [d3.event.selection[0][1], d3.event.selection[1][1]];
    //
    //             _self.rectWidth = d3.event.selection[1][0] - d3.event.selection[0][0];
    //             _self.rectHeight = d3.event.selection[1][1] - d3.event.selection[0][1];
    //
    //             _self.rectLeft = d3.event.selection[0][0] + _self.margin.left;
    //             _self.rectTop = d3.event.selection[0][1] + _self.margin.top;
    //
    //             _self.rectRight = _self.rectLeft + _self.rectWidth;
    //             _self.rectBottom = _self.rectTop + _self.rectHeight;
    //
    //             if (_self.data) {
    //                 var ids = [];
    //                 var brushed = _self.data.filter(function (d) {
    //                     if (d["content"][0] >= xdomain[0] && d["content"][0] <= xdomain[1]) {
    //                         if (d["content"][1] >= ydomain[0] && d["content"][1] <= ydomain[1]) {
    //                             ids.push(+d["id"]);
    //                             _self.svg.select("#l" + d["id"]).attr("r", 6);
    //                             return true;
    //                         } else {
    //                             _self.svg.select("#l" + d["id"]).attr("r", 3);
    //                             return false;
    //                         }
    //                     } else {
    //                         _self.svg.select("#l" + d["id"]).attr("r", 3);
    //                         return false;
    //                     }
    //                 });
    //
    //                 console.log(ids);
    //
    //
    //                 //sending ids to the server
    //                 socket.send(wrapMessage("request keywords", {content: ids, chunkSize: 30}));
    //             }
    //         }
    //     });
    //
    // _self.svg.append("g")
    //     .attr("class", "brush")
    //     .call(_self.brush);

    _self.t = d3.transition()
        .duration(200)
        .ease(d3.easeLinear);
}

Heatmap.prototype.pause = function () {
    var _self = this;
    _self.pauseFlag = true;
    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
    }
}

Heatmap.prototype.draw = function (data) {

    var _self = this;

    _self.data = data["content"];

    var progress = data["absolute-progress"];

    if (!_self.pauseFlag) {


        Feedback.updateProgressBar(_self, progress);

        _self.heatmapColorScale
            .domain(d3.extent(_self.data, function (p) {
                if (p["content"] != 0) {
                    return p["content"];
                }
            }));

        // draw rectangles
        var rectangles = _self.rectangles = _self.svg
            .selectAll(".block")
            .data(_self.data);

        rectangles.enter()
            .append("rect")
            .attr("class", "block")
            .attr("x", function (d, i) {
                return d["col"] * (_self.width / _self.bin2DCols);
            })
            .attr("y", function (d, i) {
                return d["row"] * (_self.height / _self.bin2DRows);
            })
            .attr("width", _self.width / _self.bin2DCols)
            .attr("height", _self.height / _self.bin2DRows)
            .attr("fill", function (d, i) {
                if (d["content"] == 0) {
                    return "white";
                }
                return _self.heatmapColorScale(d["content"]);

            })
            .attr("stroke", "#fff")
            .attr("cell", function (d) {
                return "r" + d.row + "c" + d.col;
            })
            .style("cursor", "pointer")
            .on("mouseenter", function () {
                console.log("mouseenter");
                this.hoverStart = Date.now();
            })
            .on("mouseover", function (d, i) {
                if (Date.now() - this.hoverStart < 1000) {
                    console.log("mouseover");
                    return;
                } else {
                    hoverStart = Date.now();
                    console.log("mouseover2");
                }
                var datum = {
                    row: d["row"],
                    col: d["col"]
                };

                _self.svg.selectAll(".block")
                    .attr("fill", function (d, i) {
                        if (d["content"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]);
                    });

                d3.select(this).attr("fill", "#a63603");

                _self.rectWidth = _self.width / 5;
                _self.rectHeight = _self.height / 5;

                _self.rectLeft = d["col"] * (_self.width / _self.bin2DCols) + _self.rectWidth > _self.width ? d["col"] * (_self.width / _self.bin2DCols) - _self.rectWidth + _self.margin.left : d["col"] * (_self.width / _self.bin2DCols) + _self.margin.left;
                _self.rectTop = d["row"] * (_self.height / _self.bin2DRows) + _self.rectHeight > _self.height ? d["row"] * (_self.height / _self.bin2DRows) - _self.rectHeight + _self.margin.top : d["row"] * (_self.height / _self.bin2DRows) + _self.margin.top;

                socket.send(wrapMessage("request keywords", {content: datum, chunkSize: 30}));
            })
            .on("click", function (d, i) {

                var datum = {
                    row: d["row"],
                    col: d["col"]
                };

                _self.svg.selectAll(".block")
                    .attr("fill", function (d, i) {
                        if (d["content"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]);
                    });

                d3.select(this).attr("fill", "#a63603");

                _self.rectWidth = _self.width / 5;
                _self.rectHeight = _self.height / 5;

                _self.rectLeft = d["col"] * (_self.width / _self.bin2DCols) + _self.rectWidth > _self.width ? d["col"] * (_self.width / _self.bin2DCols) - _self.rectWidth + _self.margin.left : d["col"] * (_self.width / _self.bin2DCols) + _self.margin.left;
                _self.rectTop = d["row"] * (_self.height / _self.bin2DRows) + _self.rectHeight > _self.height ? d["row"] * (_self.height / _self.bin2DRows) - _self.rectHeight + _self.margin.top : d["row"] * (_self.height / _self.bin2DRows) + _self.margin.top;

                socket.send(wrapMessage("request tweets", {content: datum, chunkSize: 30}));
            });


        rectangles.exit()
            .remove();

        rectangles.transition(_self.t)
            .attr("x", function (d, i) {
                return d["col"] * (_self.width / _self.bin2DCols);
            })
            .attr("y", function (d, i) {
                return d["row"] * (_self.height / _self.bin2DRows);
            })
            .attr("width", _self.width / _self.bin2DCols)
            .attr("height", _self.height / _self.bin2DRows)
            .attr("fill", function (d, i) {
                if (d["content"] == 0) {
                    return "white";
                }
                return _self.heatmapColorScale(d["content"]);
            })
            .attr("stroke", "#fff")
            .attr("cell", function (d) {
                return "r" + d.row + "c" + d.col;
            });

        if (_self.svg.selectAll("#title").empty()) {
            _self.svg.append("text")
                .attr("id", "title")
                .attr("x", _self.margin.left)
                .attr("y", _self.height + _self.margin.top + 5)
                .attr("font-size", "14px")
                .attr("fill", function (d, i) {
                    return "#222";
                })
                .attr("stroke", "transparent")
                .text("Tweets organized based on similarity in a heatmap");

        }
    }
}

Heatmap.prototype.drawKeywords = function (allKeywords) {

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

    d3.select("#keywordDiv").remove();

    _self.keywordDiv = d3.select('#' + _self.contentDiv).append("div")
        .attr("id", "keywordDiv")
        .style("background-color", "rgba(255, 255, 255, 0.6)")
        .style("height", _self.rectHeight + "px")
        .style("width", _self.rectWidth + "px")
        .style("display", "inline-block")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("left", _self.rectLeft + "px")
        .style("top", _self.rectTop + "px");

    _self.keywordbar = new KeywordBar("keywordDiv", _self.popularKeywords, _self.width / 5, _self.height / 5);

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

    var svg = _self.svg = d3.select("#" + parentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "transparent")
        .style("pointer-events", "none")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    data = data.entries().sort(function (a, b) {
        return b.value - a.value;
    }).slice(0, Math.floor(_self.height / 15));

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
        .attr("font-size", "11px")
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




