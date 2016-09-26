/**
 * Created by karthik on 8/3/16.
 */


function HorizontalBar(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "userDiv";

    _self.name = options.name;

    var contentDiv = Feedback.addProgressBar(parentDiv, _self);

    _self.popularUsers = d3.map();

    _self.stopFlag = false;
    _self.pauseFlag = false;


    _self.measureArray = [];
    _self.measures = {};

    //chunk size
    var measure = {
        min: 5,
        max: 200,
        default: 100,
        name: "Chunk Size",
        index: "chunkSize",
        step: 5,
        value: 100
    }
    _self.measureArray.push(measure);
    _self.measures[measure["index"]] = measure;

    //updates
    var measure = {
        min: 1,
        max: 10,
        default: 1,
        name: "Waiting time (Sec)",
        index: "updates",
        step: 1,
        value: 1
    }
    _self.measureArray.push(measure);
    _self.measures[measure["index"]] = measure;

    _self.optionsArray = [];
    _self.options = {};

    var option = {
        name: "Absolute Progress",
        index: "absolute",
        children: [
            {
                name: "Tweets Read",
                index: "lines"
            },
            {
                name: "Bytes Read",
                index: "bytes"
            }
        ]
    }

    _self.optionsArray.push(option);
    _self.options[option["index"]] = option["children"][0]["index"];

    var option = {
        name: "Relative Progress",
        index: "relative",
        children: [
            {
                name: "User Similarity",
                index: "diversity"
            },
            {
                name: "Speed",
                index: "speed"
            },
        ]
    }

    _self.optionsArray.push(option);
    _self.options[option["index"]] = option["children"][0]["index"];

    if (!controlInterface) {
        Feedback.addControlMinimize(parentDiv, _self);
    }

    var margin = {
            top: 25,
            right: 20,
            bottom: 10,
            left: 110
        },
        width = $("#" + contentDiv).width() - margin.left - margin.right,
        height = $("#" + contentDiv).height() - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var y = _self.y = d3.scaleBand()
        .range([height, 0])
        .paddingOuter(0.3)
        .paddingInner(0.3);

    var x = _self.x = d3.scaleLinear()
        .range([0, width]);

    _self.highest = 5;

    var xAxis = _self.xAxis = d3.axisTop(x).ticks(4, ",d").tickSizeInner(-height)
        .tickSizeOuter(0)
        .tickPadding(10);

    var yAxis = _self.yAxis = d3.axisLeft(y);

    var svg = _self.svg = d3.select("#" + contentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    _self.xElement = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,0)")
        .call(xAxis)
        .style("font-size", "10px");

    _self.yElement = svg.append("g")
        .attr("class", "y axis")
        .style("font-size", "12px")
        .call(yAxis);

    svg.append("text")
        .attr("x", width - 50)
        .attr("y", 0)
        .style("font-size", "12px")
        .style("text-anchor", "end")
        .text("#Tweets");
}


HorizontalBar.prototype.pause = function () {
    var _self = this;
    _self.pauseFlag = !_self.pauseFlag;
    socket.send(wrapMessage("pause interface", _self.name));
    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
    }

}

HorizontalBar.prototype.stop = function () {
    var _self = this;
    _self.stopFlag = !_self.stopFlag;
    if (_self.stopFlag) {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/stop.png")');
    }
}

HorizontalBar.prototype.forward = function () {
    var _self = this;

}

HorizontalBar.prototype.rewind = function () {
    var _self = this;

}


HorizontalBar.prototype.highlight = function (cache) {
    var _self = this;

    var chunkId = cache["id"];
    var progress = cache["absolute-progress"];
    var uData = cache["users"];

    _self.selectedUsers = d3.entries(uData);

    _self.selectedUsersData = _self.selectedUsers.sort(function (a, b) {

        if (a.value == b.value) {
            return (a.key < b.key) ? -1 : (a.key > b.key) ? 1 : 0;
        }
        else {
            return (a.value < b.value) ? -1 : 1;
        }

        return 0;

    });

    _self.selectedUsersData = _self.selectedUsersData
        .slice(_self.selectedUsersData.length - Math.floor(_self.height / 15), _self.selectedUsersData.length);


    _self.y.domain(_self.selectedUsersData.map(function (d) {
        return d.key;
    }));

    var max = d3.max(_self.selectedUsersData, function (d) {
        return d.value;
    });

    _self.x.domain([0, max]);

    _self.xAxis.ticks(max > 5 ? 5 : max);

    _self.svg.select(".x.axis").call(_self.xAxis);
    _self.svg.select(".y.axis").call(_self.yAxis);

    var selection = _self.svg.selectAll(".bar")
        .data(_self.selectedUsersData, function (d, i) {
            return i;
        });

    selection.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", function (d, i) {

            return _self.y(d.key);
        })
        .attr("height",  _self.y.bandwidth())
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
            return "#222";
        })
        .style("fill-opacity", 1);

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
            return "#222";
        })
        .style("fill-opacity", 1);

    selection.exit().transition().duration(10).remove();
}

HorizontalBar.prototype.draw = function (cache, override) {

    var _self = this;

    var uData = cache["processed"];

    _self.popularUsers = d3.entries(uData);

    _self.popularUsersData = _self.popularUsers.sort(function (a, b) {

        if (a.value == b.value) {
            return (a.key < b.key) ? -1 : (a.key > b.key) ? 1 : 0;
        }
        else {
            return (a.value < b.value) ? -1 : 1;
        }

        return 0;

    });

    _self.popularUsersData = _self.popularUsersData
        .slice(_self.popularUsersData.length - Math.floor(_self.height / 15), _self.popularUsersData.length);

    if (!_self.pauseFlag || override) {

        if (Object.keys(cache).indexOf("progress-histories") >= 0) {

            Feedback.updateProgressBar(_self, cache["absolute-progress"], cache["progress-histories"]);

        }

        var max = d3.max(_self.popularUsersData, function (d) {
            return d.value;
        });

        if (max >= _self.highest) {
            _self.highest = 2 * max;

        }

        var xdomain0 = _self.x.domain();
        var xdomain1 = [0, _self.highest];

        _self.xAxis.ticks(_self.highest > 5 ? 5 : _self.highest);

        _self.xElement.transition()
            .duration(100)
            .tween("axis", function (d, i) {
                var i = d3.interpolate(xdomain0, xdomain1);
                return function (t) {
                    _self.x.domain(i(t));
                    _self.xElement.call(_self.xAxis);
                }
            })
            .on("end", function () {

                var ydomain0 = _self.y.domain();
                var ydomain1 = _self.popularUsersData.map(function (d) {
                    return d.key;
                });

                _self.y.domain(ydomain1);
                _self.yElement.call(_self.yAxis);

                var selection = _self.svg.selectAll(".bar")
                    .data(_self.popularUsersData, function (d, i) {
                        return d.key;
                    });

                selection
                    .attr("y", function (d, i) {
                        return _self.y(d.key);
                    })
                    .attr("height", _self.y.bandwidth())
                    .attr("width", function (d) {
                        return _self.x(d.value);
                    });

                selection.enter()
                    .append("rect")
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
                        return "#222";
                    })
                    .style("fill-opacity", 1);

                selection.exit().remove();

                // _self.yElement.transition()
                //     .duration(100)
                //     .tween("axis", function (d, i) {
                //
                //         // _self.y.domain(ydomain1);
                //         // _self.yElement.call(_self.yAxis);
                //
                //         // var i = d3.interpolate(ydomain0, ydomain1);
                //         return function (t) {
                //             _self.y.domain(i(t));
                //             _self.yElement.call(_self.yAxis);
                //         }
                //     })
                //     .on("end", function () {
                //
                //
                //     })
            });

        //_self.x.domain([0, _self.highest]);

        // _self.y.domain(_self.popularUsersData.map(function (d) {
        //     return d.key;
        // }));

        //_self.svg.select(".x.axis").call(_self.xAxis);

        //_self.yAxis = d3.axisLeft(_self.y);

        //_self.svg.select(".y.axis").call(_self.yAxis);


    }

}

