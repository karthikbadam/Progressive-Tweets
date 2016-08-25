/**
 * Created by karthik on 8/3/16.
 */


function HorizontalBar(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "userDiv";

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
            top: 5,
            right: 20,
            bottom: 40,
            left: 110
        },
        width = $("#"+contentDiv).width() - margin.left - margin.right,
        height = $("#"+contentDiv).height() - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var y = _self.y = d3.scaleBand()
        .range([height, 0])
        .paddingOuter(0.3)
        .paddingInner(0.3);

    var x = _self.x = d3.scaleLinear()
        .range([0, width]);


    _self.highest = 10;

    var xAxis = _self.xAxis = d3.axisBottom(x).ticks(4, ",d").tickSizeInner(-height)
        .tickSizeOuter(0)
        .tickPadding(10);

    var yAxis = _self.yAxis = d3.axisLeft(y);

    var svg = _self.svg = d3.select("#"+contentDiv).append("svg")
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


HorizontalBar.prototype.draw = function (data, progress) {

    var _self = this;

    if (!_self.pauseFlag) {

        Feedback.updateProgressBar(_self, progress);

        _self.y.domain(data.map(function (d) {
            return d.key;
        }).reverse());

        var max = d3.max(data, function (d) {
            return d.value;
        });

        if (max >= _self.highest) {
            _self.highest = 2 * max;

        }
        _self.x.domain([0, _self.highest]);

        _self.svg.select(".x.axis").call(_self.xAxis);
        _self.svg.select(".y.axis").call(_self.yAxis);

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

