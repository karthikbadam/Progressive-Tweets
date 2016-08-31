/**
 * Created by karthik on 8/3/16.
 */

function Bar(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "sentimentDiv";

    _self.emotions = options.emotions;

    _self.emotionValues = new Array(options.emotions.length);

    for (var i = 0; i < _self.emotions.length; i++) {
        _self.emotionValues[i] = 0;
    }


    _self.selectedEmotions = null;

    _self.highest = 10;

    var contentDiv = Feedback.addProgressBar(parentDiv, _self);

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

    var margin = {
            top: 15,
            right: 5,
            bottom: 25,
            left: 40
        },
        width = $("#" + contentDiv).width() - margin.left - margin.right,
        height = $("#" + contentDiv).height() - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var x = _self.x = d3.scaleBand()
        .range([0, width])
        .paddingOuter(0.2)
        .paddingInner(0.2);

    var y = _self.y = d3.scaleLinear()
        .range([height, 0]);

    var xAxis = _self.xAxis = d3.axisBottom(x);

    var yAxis = _self.yAxis = d3.axisLeft(y)
        .ticks(10)
        .tickFormat(d3.format("d"));

    var svg = _self.svg = d3.select("#" + contentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(options.emotions);

    y.domain([0, _self.highest]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("font-size", "15px")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .style("font-size", "12px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("font-size", "15px")
        .style("text-anchor", "end")
        .text("#Tweets");

    svg.selectAll(".bar")
        .data([0, 0, 0, 0])
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d, i) {
            return x(emotions[i]);
        })
        .attr("width", x.bandwidth())
        .attr("y", function (d) {
            return y(d);
        })
        .attr("height", function (d) {
            return height - y(d) + 1;
        })
        .style("fill-opacity", 0.5);

    svg.selectAll(".cap")
        .data([0, 0, 0, 0])
        .enter().append("line")
        .attr("class", "cap")
        .attr("x1", function (d, i) {
            return x(emotions[i]);
        })
        .attr("x2", function (d, i) {
            return x(emotions[i]) - 5;
        })
        .attr("y1", function (d) {
            return y(d);
        })
        .attr("y2", function (d) {
            return y(d);
        })
        .attr("stroke-width", 1)
        .attr("stroke", "#222")
        .attr("stroke-opacity", 0.5);

}

Bar.prototype.pause = function () {
    var _self = this;

    _self.pauseFlag = true;
}


Bar.prototype.highlight = function (cache) {
    var _self = this;

    var chunkId = cache["id"];
    var progress = cache["absolute-progress"];
    var tweetChunk = cache["content"];

    _self.selectedEmotions = new Array(_self.emotions.length);

    for (var i = 0; i < _self.emotions.length; i++) {
        _self.selectedEmotions[i] = 0;
    }

    tweetChunk.forEach(function (tweetData, i) {

        // Processing the rating
        var ratingValue = +tweetData["sentiment"];

        if (!isNaN(ratingValue) && ratingValue > 0) {
            _self.selectedEmotions[ratingValue - 1]++;
        }
    });

    console.log(_self.selectedEmotions);

    var max = d3.max(_self.selectedEmotions, function (d) {
        return d;
    });

    _self.y.domain([0, max]);
    _self.yAxis.ticks(max > 10? 10: max);
    _self.svg.select(".y.axis").transition().duration(100).call(_self.yAxis);

    _self.bars.transition().duration(10)
        .attr("x", function (d, i) {
            return _self.x(_self.emotions[i]);
        })
        .attr("width", _self.x.bandwidth())
        .attr("y", function (d) {
            return _self.y(d);
        })
        .attr("height", function (d) {
            return _self.height - _self.y(d);
        })
        .style("fill", function (d, i) {
            return "rgb(" + "200, 200, 200" + ")";
        })
        .style("stroke", function (d, i) {
            return "transparent";
        })
        .style("fill-opacity", 0.1);

    var selectedEmotions = _self.selectedEmotions = _self.svg.selectAll(".selectedBar")
        .data(_self.selectedEmotions);

    _self.selectedEmotions
        .enter()
        .append("rect")
        .attr("class", "selectedBar")
        .transition().duration(10)
        .attr("x", function (d, i) {
            return _self.x(_self.emotions[i]);
        })
        .attr("width", _self.x.bandwidth())
        .attr("y", function (d) {
            return _self.y(d);
        })
        .attr("height", function (d) {
            return _self.height - _self.y(d);
        })
        .style("fill", function (d, i) {
            return "rgb(" + colors[i] + ")";
        })
        .style("stroke", function (d, i) {
            return "#222";
        })
        .style("fill-opacity", 0.5);

    _self.selectedEmotions
        .transition().duration(10)
        .attr("x", function (d, i) {
            return _self.x(_self.emotions[i]);
        })
        .attr("width", _self.x.bandwidth())
        .attr("y", function (d) {
            return _self.y(d);
        })
        .attr("height", function (d) {
            return _self.height - _self.y(d);
        })
        .style("fill", function (d, i) {
            return "rgb(" + colors[i] + ")";
        })
        .style("stroke", function (d, i) {
            return "#222";
        })
        .style("fill-opacity", 0.5);

    _self.selectedEmotions.exit().remove();
}

Bar.prototype.draw = function (cache) {

    var _self = this;

    var progress = cache["absolute-progress"];
    var tweetChunk = cache["content"];

    tweetChunk.forEach(function (tweetData, i) {

        // Processing the rating
        var ratingValue = +tweetData["sentiment"];

        if (!isNaN(ratingValue) && ratingValue > 0) {
            _self.emotionValues[ratingValue - 1]++;
        }
    });


    if (!_self.pauseFlag) {

        if (progress) {
            Feedback.updateProgressBar(_self, progress);
        }

        if (_self.selectedEmotions) {
            _self.selectedEmotions.remove();
        }

        var max = d3.max(_self.emotionValues, function (d) {
            return d;
        });

        if (max >= _self.highest) {
            _self.highest = 2 * max;

        }
        _self.y.domain([0, _self.highest]);

        _self.svg.select(".y.axis").call(_self.yAxis);

        var bars = _self.bars = _self.svg.selectAll(".bar")
            .data(_self.emotionValues);

        _self.bars.transition().duration(10)
            .attr("x", function (d, i) {
                return _self.x(_self.emotions[i]);
            })
            .attr("width", _self.x.bandwidth())
            .attr("y", function (d) {
                return _self.y(d);
            })
            .attr("height", function (d) {
                return _self.height - _self.y(d);
            })
            .style("fill", function (d, i) {
                return "rgb(" + colors[i] + ")";
            })
            .style("stroke", function (d, i) {
                return "#222";
            })
            .style("fill-opacity", 0.5);

        // data.forEach(function (d, i) {
        //     _self.svg.append("line")
        //         .attr("class", "cap")
        //         .attr("x1", _self.x(emotions[i]))
        //         .attr("x2", _self.x(emotions[i]) - 5)
        //         .attr("y1", _self.y(d))
        //         .attr("y2", _self.y(d))
        //         .attr("stroke-width", 1)
        //         .attr("stroke", "#222")
        //         .attr("stroke-opacity", 0.5);
        // });
    }
}