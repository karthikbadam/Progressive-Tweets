/**
 * Created by karthik on 8/26/16.
 */

function Heatmap(options) {

    var _self = this;

    _self.name = options.name;

    var parentDiv = _self.parentDiv = "content-right";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    _self.stopFlag = false;
    _self.pauseFlag = false;

    Feedback.addControlMinimize(parentDiv, _self);

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
        .attr("id", "heatmap")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Create the area where the lasso event can be triggered
    var lasso_area = _self.svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("opacity", 0);

    var lasso_end = function () {

        d3.select("#keywordDiv").remove();


        lasso.items().attr("fill", function (d, i) {
            if (d["content"]["density"] == 0) {
                return "white";
            }
            return _self.heatmapColorScale(d["content"]["density"]);

        }).attr("stroke-width", 1).attr("stroke", "white");

        var ids = [];

        // Style the selected dots
        lasso.items().filter(function (d) {
            if (d.selected === true) {

                var datum = {};

                // collect the ids here
                datum["row"] = d["row"];
                datum["col"] = d["col"];

                ids.push(datum);

            }
            return d.selected === true;
        })
            .attr("stroke-width", 10)
            .attr("stroke", function (d, i) {
                if (d["content"]["density"] == 0) {
                    return "white";
                }
                return _self.heatmapColorScale(d["content"]["density"]);

            });


        // Reset the selection
        lasso.items().each(function (d) {
            d.selected = true;
        })


        if (ids.length > 0) {

            var d = ids[ids.length - 1];

            _self.rectWidth = _self.width / 5;
            _self.rectHeight = _self.height / 5;

            _self.rectLeft = d["col"] * (_self.width / _self.bin2DCols) + _self.rectWidth > _self.width ? d["col"] * (_self.width / _self.bin2DCols) - _self.rectWidth + _self.margin.left : d["col"] * (_self.width / _self.bin2DCols) + _self.margin.left;
            _self.rectTop = d["row"] * (_self.height / _self.bin2DRows) + _self.rectHeight > _self.height ? d["row"] * (_self.height / _self.bin2DRows) - _self.rectHeight + _self.margin.top : d["row"] * (_self.height / _self.bin2DRows) + _self.margin.top;

            socket.send(wrapMessage("request texts", {content: ids, chunkSize: 30}));

        }
    };

    // Define the lasso
    var lasso = _self.lasso = d3.lasso()
        .svgParent("heatmap g")
        .closePathDistance(75) // max distance for the lasso loop to be closed
        .closePathSelect(true) // can items be selected by closing the path?
        .hoverSelect(true) // can items by selected by hovering over them?
        .area(lasso_area) // area where the lasso can be started
        .on("end", lasso_end); // lasso end function

    // Init the lasso on the svg:g that contains the dots
    _self.svg.call(lasso);

    _self.data = null;

    _self.bin2DRows = 80;
    _self.bin2DCols = 40;

    _self.heatmapColorScale = d3.scaleLinear()
        .range(["#deebf7", "#08306b"]);

    _self.t = d3.transition()
        .duration(500)
        .delay(1000)
        .ease(d3.easeLinear);
}

Heatmap.prototype.pause = function () {
    var _self = this;
    _self.pauseFlag = !_self.pauseFlag;
    socket.send(wrapMessage("pause interface", _self.name));
    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
        _self.svg.selectAll(".label").style("display", "none");

    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
        _self.svg.selectAll(".label").style("display", "block");


        _self.lasso.items().attr("fill", function (d, i) {
            if (d["content"]["density"] == 0) {
                return "white";
            }
            return _self.heatmapColorScale(d["content"]["density"]);

        })
            .attr("stroke-width", 1)
            .attr("stroke", "white");

        d3.select("#keywordDiv").remove();
    }
}

Heatmap.prototype.stop = function () {
    var _self = this;
    _self.stopFlag = !_self.stopFlag;
    if (_self.stopFlag) {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/stop.png")');
    }
}

Heatmap.prototype.forward = function () {
    var _self = this;

}

Heatmap.prototype.rewind = function () {
    var _self = this;

}

Heatmap.prototype.drawClusters = function (data) {
    var _self = this;

    _self.clusters = data["content"]["clusters"];


    _self.clusters.forEach(function (cluster, i) {

        var customHull = d3.polygonHull(cluster["points"]
            .map(function (d) {

                return [(d["col"] + 0.5) * (_self.width / _self.bin2DCols), (d["row"] + 0.5) * (_self.height / _self.bin2DRows)];
            }));

        var hull;

        if (_self.svg.select("#hull" + i).empty()) {
            hull = _self.svg.append("path").attr("id", "hull" + i).attr("class", "hull");
        } else {
            hull = _self.svg.select("#hull" + i);
        }

        hull.datum(customHull)
            .attr("d", function (d) {
                cluster["mean"] = [d3.mean(d, function (g) {
                    return g[0];
                }), d3.mean(d, function (g) {
                    return g[1];
                })];

                return "M" + d.map(function (n) {
                        return [n[0], n[1]]
                    }).join("L") + "Z";
            })
            .style("fill", "#666")
            .style("fill-opacity", 0.1)
            .style("stroke", "#666")
            .style("stroke-width", "0px")
            .style("stroke-linejoin", "round")
            .style("pointer-events", "none");

    });

}

Heatmap.prototype.drawLabels = function (data) {

    var _self = this;

    _self.clusters = data["content"]["clusters"];

    _self.svg.selectAll(".label").remove();

     var labels = _self.svg.selectAll(".label").data(_self.clusters)
        .enter().append("g")
        .attr("id", function (d, i) {
            return "label" + i;
        })
        .attr("class", "label");

    labels.append("text")
        .each(function (d) {
            var arr = d["keywords"]
            if (arr != undefined) {
                for (i = 0; i < 10; i++) {
                    d3.select(this).append("tspan")
                        .text(arr[i]["word"])
                        .attr("dy", i ? "1.2em" : 0)
                        .attr("x", 0)
                        .attr("text-anchor", "middle")
                        .attr("class", "tspan" + i);
                }
            }
        })
        .style("font-size", "0.7em")
        .attr("transform", function (d) {
            var attr = this.getBBox();
            var left = d["mean"]["0"] - attr.width / 2;
            var top = d["mean"]["1"] - attr.height / 2;
            return "translate(" + left + "," + top + ")";
        })
        .style("pointer-events", "none");
}

Heatmap.prototype.draw = function (data) {

    var _self = this;

    _self.data = data["content"]["layout"];

    var progress = data["absolute-progress"];

    if (!_self.pauseFlag) {

        Feedback.updateProgressBar(_self, progress);

        _self.drawClusters(data);

        var domain = d3.extent(_self.data, function (p) {
            if (p["content"]["density"] != 0) {
                return p["content"]["density"];
            }
        });

        _self.heatmapColorScale
            .domain(domain);

        var extent = domain[1] - domain[0];

        // Add a legend for the color values.
        var legend = _self.legend = _self.svg.selectAll(".legend")
            .data(_self.heatmapColorScale.ticks(k = extent > 6 ? 6 : extent).reverse(), function (d, i) {
                return i;
            });

        var newLegend = _self.legend.enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) {
                return "translate(" + (_self.width - 50) + "," + (20 + i * 20) + ")";
            });

        newLegend.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", function (d) {
                return _self.heatmapColorScale(d);
            });

        newLegend.append("text")
            .attr("x", 26)
            .attr("y", 10)
            .attr("dy", ".35em")
            .text(function (d) {
                return d;
            });


        _self.legend.select("rect").style("fill", function (d) {
            return _self.heatmapColorScale(d);
        });
        _self.legend.select("text").text(function (d) {
            return d;
        });

        _self.legend.exit().remove();

        if (_self.svg.select(".label").empty()) {
            _self.svg.append("text")
                .attr("class", "label")
                .attr("x", _self.width - 50)
                .attr("y", 10)
                .attr("dy", ".35em")
                .text("#Tweets");
        }

        // draw rectangles
        var rectangles = _self.rectangles = _self.svg
            .selectAll(".block")
            .data(_self.data, function (d) {
                return "c" + d["col"] + "r" + d["row"];
            });

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
                if (d["content"]["density"] == 0) {
                    return "white";
                }
                return _self.heatmapColorScale(d["content"]["density"]);

            })
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .attr("cell", function (d) {
                return "r" + d.row + "c" + d.col;
            })
            .style("cursor", "pointer")
            .on("mouseenter", function () {
                console.log("mouseenter");
                this.hoverStart = Date.now();
            })
            .on("mouseleave", function () {
                console.log("mouseleave");

                _self.svg.selectAll(".label").style("display", "block");


                this.hoverStart = Date.now();
                _self.svg.selectAll(".block")
                    .attr("fill", function (d, i) {
                        if (d["content"]["density"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]["density"]);
                    }).attr("stroke-width", 1).attr("stroke", "white");

                d3.select("#keywordDiv").remove();
            })
            .on("mouseover", function (d, i) {

                _self.svg.selectAll(".label").style("display", "none");


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
                        if (d["content"]["density"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]["density"]);
                    }).attr("stroke-width", 1).attr("stroke", "white");

                d3.select(this).attr("stroke-width", 10)
                    .attr("stroke", function (d, i) {
                        if (d["content"]["density"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]["density"]);

                    });

                _self.rectWidth = _self.width / 5;
                _self.rectHeight = _self.height / 5;

                _self.rectLeft = d["col"] * (_self.width / _self.bin2DCols) + _self.rectWidth > _self.width ? d["col"] * (_self.width / _self.bin2DCols) - _self.rectWidth + _self.margin.left : d["col"] * (_self.width / _self.bin2DCols) + _self.margin.left;
                _self.rectTop = d["row"] * (_self.height / _self.bin2DRows) + _self.rectHeight > _self.height ? d["row"] * (_self.height / _self.bin2DRows) - _self.rectHeight + _self.margin.top : d["row"] * (_self.height / _self.bin2DRows) + _self.margin.top;

                socket.send(wrapMessage("request keywords", {content: [datum], chunkSize: 30}));
            })
            .on("click", function (d, i) {

                var datum = {
                    row: d["row"],
                    col: d["col"]
                };

                _self.svg.selectAll(".block")
                    .attr("fill", function (d, i) {
                        if (d["content"]["density"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]["density"]);
                    }).attr("stroke-width", 1).attr("stroke", "white");

                d3.select(this).attr("stroke-width", 10)
                    .attr("stroke", function (d, i) {
                        if (d["content"]["density"] == 0) {
                            return "white";
                        }
                        return _self.heatmapColorScale(d["content"]["density"]);

                    });

                _self.rectWidth = _self.width / 5;
                _self.rectHeight = _self.height / 5;

                _self.rectLeft = d["col"] * (_self.width / _self.bin2DCols) + _self.rectWidth > _self.width ? d["col"] * (_self.width / _self.bin2DCols) - _self.rectWidth + _self.margin.left : d["col"] * (_self.width / _self.bin2DCols) + _self.margin.left;
                _self.rectTop = d["row"] * (_self.height / _self.bin2DRows) + _self.rectHeight > _self.height ? d["row"] * (_self.height / _self.bin2DRows) - _self.rectHeight + _self.margin.top : d["row"] * (_self.height / _self.bin2DRows) + _self.margin.top;

                socket.send(wrapMessage("request texts", {content: [datum], chunkSize: 30}));
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
                if (d["content"]["density"] == 0) {
                    return "white";
                }
                return _self.heatmapColorScale(d["content"]["density"]);
            })
            .attr("stroke-width", 1)
            .attr("cell", function (d) {
                return "r" + d.row + "c" + d.col;
            });


        _self.lasso.items(_self.svg
            .selectAll(".block"));

        if (_self.svg.selectAll("#title").empty()) {
            _self.svg.append("text")
                .attr("id", "title")
                .attr("x", _self.margin.left)
                .attr("y", _self.height + _self.margin.top - 5)
                .attr("font-size", "14px")
                .attr("fill", function (d, i) {
                    return "#222";
                })
                .attr("stroke", "transparent")
                .text("Tweets organized based on similarity in a heatmap");

        }
        _self.drawLabels(data);

    }
}

Heatmap.prototype.drawKeywords = function (allKeywords, fromSelection) {

    var _self = this;

    if (fromSelection) {
        var data = allKeywords;

        allKeywords = [];

        data.forEach(function (datum) {
            datum["keywords"].forEach(function (keyword) {
                allKeywords.push({"keyword": keyword, "sentiment": datum["sentiment"]});
            })
        })

    }

    _self.popularKeywords = d3.map();
    _self.keywordSentiments = {};

    // counting keywords
    allKeywords.forEach(function (d) {

        keyword = d["keyword"];
        sentiment = emotions.indexOf(d["sentiment"]);

        if (_self.popularKeywords.has(keyword)) {

            _self.popularKeywords.set(keyword, _self.popularKeywords.get(keyword) + 1);

            _self.keywordSentiments[keyword] += sentiment;

        } else {

            _self.popularKeywords.set(keyword, 1);

            _self.keywordSentiments[keyword] = sentiment;
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

    _self.keywordbar = new KeywordBar("keywordDiv", _self.popularKeywords, _self.keywordSentiments, _self.width / 5, _self.height / 5);

}

function KeywordBar(parentDiv, data, sentiments, rectWidth, rectHeight) {

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
            return "rgb(" + colors[Math.round(sentiments[d.key] / d.value)] + ")";
        })
        .style("stroke", function (d, i) {
            return "#888";
        })
        .style("fill-opacity", 0.5)
        .attr("stroke-width", 1);

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
            return "rgb(" + colors[Math.round(sentiments[d.key] / d.value)] + ")";
        })
        .style("stroke", function (d, i) {
            return "#888";
        })
        .style("fill-opacity", 0.5)
        .attr("stroke-width", 1);

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




