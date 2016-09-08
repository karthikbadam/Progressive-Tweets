/**
 * Created by karthik on 8/3/16.
 */


function HorizontalBar(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "userDiv";

    var contentDiv = Feedback.addProgressBar(parentDiv, _self);

    _self.popularUsers = d3.map();

    _self.stopFlag = false;
    _self.pauseFlag = false;

    Feedback.addControlMinimize(parentDiv, _self);

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

    var xAxis = _self.xAxis = d3.axisTop(x).ticks(5, ",d").tickSizeInner(height)
        .tickSizeOuter(0)
        .tickPadding(10);

    var yAxis = _self.yAxis = d3.axisLeft(y);

    var svg = _self.svg = d3.select("#" + contentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .style("font-size", "12px")
        .append("text")
        .attr("x", width - 50)
        .attr("dy", ".71em")
        .style("font-size", "15px")
        .style("text-anchor", "end")
        .text("#Tweets");

    svg.append("g")
        .attr("class", "y axis")
        .style("font-size", "12px")
        .call(yAxis);
}


HorizontalBar.prototype.pause = function () {
    var _self = this;
    _self.pauseFlag = !_self.pauseFlag;
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
    var tweetChunk = cache["content"];

    _self.selectedUsers = d3.map();

    tweetChunk.forEach(function (tweetData, i) {

        // counting the tweets
        if (_self.selectedUsers.has(tweetData["author"])) {

            _self.selectedUsers.set(tweetData["author"], _self.selectedUsers.get(tweetData["author"]) + 1);

        } else {

            _self.selectedUsers.set(tweetData["author"], 1);
        }

    });

    _self.selectedUsersData = _self.selectedUsers.entries().sort(function (a, b) {

        if (a.value == b.value) {
            return (a.key < b.key) ? -1 : (a.key > b.key) ? 1 : 0;
        }
        else {
            return (a.value < b.value) ? -1 : 1;
        }

        return 0;

    });

    var selectedAuthors = _self.selectedUsersData.map(function (d) {
        return d.key;
    });

    selectedAuthors = selectedAuthors.concat(_self.y.domain()).reverse();

    _self.y.domain(selectedAuthors.slice(selectedAuthors.length -  Math.floor(_self.height / 15), selectedAuthors.length));

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

HorizontalBar.prototype.draw = function (cache) {

    var _self = this;

    var chunkId = cache["id"];
    var progress = cache["absolute-progress"];
    var tweetChunk = cache["content"];

    tweetChunk.forEach(function (tweetData, i) {

        // counting the tweets
        if (_self.popularUsers.has(tweetData["author"])) {

            _self.popularUsers.set(tweetData["author"], _self.popularUsers.get(tweetData["author"]) + 1);

        } else {
            _self.popularUsers.set(tweetData["author"], 1);
        }

    });

    _self.popularUsersData = _self.popularUsers.entries().sort(function (a, b) {

        if (a.value == b.value) {
            return (a.key < b.key) ? -1 : (a.key > b.key) ? 1 : 0;
        }
        else {
            return (a.value < b.value) ? -1 : 1;
        }

        return 0;

    });

    _self.popularUsersData =  _self.popularUsersData
        .slice(_self.popularUsersData.length -  Math.floor(_self.height / 15), _self.popularUsersData.length);

    if (!_self.pauseFlag) {

        Feedback.updateProgressBar(_self, progress);

        _self.y.domain(_self.popularUsersData.map(function (d) {
            return d.key;
        }));

        var max = d3.max(_self.popularUsersData, function (d) {
            return d.value;
        });

        if (max >= _self.highest) {
            _self.highest = 2 * max;

        }

        _self.x.domain([0, _self.highest]);

        _self.xAxis.ticks(_self.highest > 5 ? 5 : _self.highest);

        _self.svg.select(".x.axis").call(_self.xAxis);

        _self.yAxis = d3.axisLeft(_self.y);

        _self.svg.select(".y.axis").call(_self.yAxis);

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
    }

}

