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

    _self.stopFlag = false;
    _self.pauseFlag = false;

    Feedback.addControlMinimize(parentDiv, _self);

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
        .style("font-size", "12px")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .style("font-size", "12px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("font-size", "12px")
        .style("text-anchor", "end")
        .text("#Tweets");

    // svg.selectAll(".cap")
    //     .data([0, 0, 0, 0])
    //     .enter().append("line")
    //     .attr("class", "cap")
    //     .attr("x1", function (d, i) {
    //         return x(emotions[i]);
    //     })
    //     .attr("x2", function (d, i) {
    //         return x(emotions[i]) - 5;
    //     })
    //     .attr("y1", function (d) {
    //         return y(d);
    //     })
    //     .attr("y2", function (d) {
    //         return y(d);
    //     })
    //     .attr("stroke-width", 1)
    //     .attr("stroke", "#222")
    //     .attr("stroke-opacity", 0.5);

}

Bar.prototype.pause = function () {
    var _self = this;
    _self.pauseFlag = !_self.pauseFlag;
    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
    }
}

Bar.prototype.stop = function () {
    var _self = this;
    _self.stopFlag = !_self.stopFlag;
    if (_self.stopFlag) {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/stop.png")');
    }
}

Bar.prototype.forward = function () {
    var _self = this;

}

Bar.prototype.rewind = function () {
    var _self = this;

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
        var ratingValue = tweetData["sentiment"];

        if (!isNaN(ratingValue) && parseInt(ratingValue) > 0) {

            _self.selectedEmotions[parseInt(ratingValue) - 1]++;

        } else if (isNaN(ratingValue) && _self.emotions.indexOf(ratingValue) >= 0) {
            //means its a string
            _self.selectedEmotions[_self.emotions.indexOf(ratingValue)]++;
        }
    });

    var max = d3.max(_self.selectedEmotions, function (d) {
        return d;
    });

    _self.y.domain([0, max]);
    _self.yAxis.ticks(max > 10 ? 10 : max);
    _self.svg.select(".y.axis").transition().duration(100).delay(500).call(_self.yAxis);

    _self.bars
        .attr("height", function (d) {
            return _self.height - _self.y(d);
        })
        .style("fill", function (d, i) {
            return "rgb(200, 200, 200)";
        })
        .style("stroke", function (d, i) {
            return "transparent";
        })
        .style("fill-opacity", 0.1);

    var selectedBars = _self.selectedBars = _self.svg.selectAll(".selectedBar")
        .data(_self.selectedEmotions);

    _self.selectedBars
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

    _self.selectedBars
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

    _self.selectedBars.exit().remove();
}

Bar.prototype.draw = function (cache) {

    var _self = this;

    var progress = cache["absolute-progress"];
    var tweetChunk = cache["content"];

    tweetChunk.forEach(function (tweetData, i) {

        // Processing the rating
        var ratingValue = tweetData["sentiment"];

        if (!isNaN(ratingValue) && parseInt(ratingValue) > 0) {

            _self.emotionValues[parseInt(ratingValue) - 1]++;

        } else if (isNaN(ratingValue) && _self.emotions.indexOf(ratingValue) >= 0) {
            //means its a string
            _self.emotionValues[_self.emotions.indexOf(ratingValue)]++;
        }
    });


    if (!_self.pauseFlag) {

        if (progress) {
            Feedback.updateProgressBar(_self, progress);
        }

        if (_self.svg.selectAll(".selectedBar")) {
            _self.svg.selectAll(".selectedBar").remove();
        }

        var max = d3.max(_self.emotionValues, function (d) {
            return d;
        });

        if (max >= _self.highest) {
            _self.highest = 2 * max;

        }

        _self.yAxis.ticks(max > 10 ? 10 : max);

        _self.y.domain([0, _self.highest]);

        _self.svg.select(".y.axis").call(_self.yAxis);

        var bars = _self.bars = _self.svg.selectAll(".bar")
            .data(_self.emotionValues);

        _self.bars.enter()
            .append("rect")
            .attr("class", "bar")
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

        _self.bars
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

        _self.bars.exit().remove();

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