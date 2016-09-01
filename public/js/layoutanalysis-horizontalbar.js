/**
 * Created by karthik on 8/3/16.
 */


function HorizontalBar(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "userDiv";

    var contentDiv = Feedback.addProgressBar(parentDiv, _self);

    _self.popularUsers = d3.map();

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

    _self.highest = 10;

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
    _self.pauseFlag = true;
    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
    }


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
        return b.value - a.value;
    });

    var selectedAuthors = _self.selectedUsersData.map(function (d) {
            return d.key;
    }).reverse();

    selectedAuthors = selectedAuthors.concat(_self.y.domain());

    _self.y.domain(selectedAuthors.slice(0, Math.floor(_self.height / 15)).reverse());

    var max = d3.max(_self.selectedUsersData, function (d) {
        return d.value;
    });

    _self.x.domain([0, max]);

    _self.xAxis.ticks(max > 5? 5: max);

    _self.svg.select(".x.axis").call(_self.xAxis);
    _self.svg.select(".y.axis").call(_self.yAxis);

    var selection = _self.svg.selectAll(".bar")
        .data(_self.selectedUsersData);

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
        return b.value - a.value;
    }).slice(0, Math.floor(_self.height / 15));

    if (!_self.pauseFlag) {

        Feedback.updateProgressBar(_self, progress);

        _self.y.domain(_self.popularUsersData.map(function (d) {
            return d.key;
        }).reverse());

        var max = d3.max(_self.popularUsersData, function (d) {
            return d.value;
        });

        if (max >= _self.highest) {
            _self.highest = 2 * max;

        }
        _self.x.domain([0, _self.highest]);

        _self.svg.select(".x.axis").call(_self.xAxis);
        _self.svg.select(".y.axis").call(_self.yAxis);

        var selection = _self.svg.selectAll(".bar")
            .data(_self.popularUsersData);

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

}

