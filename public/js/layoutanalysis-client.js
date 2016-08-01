/**
 * Created by Karthik on 7/19/16.
 */

var socket;

var dataFile = "twitter_debate.txt";

var sentimentBar, userBar, tweetScatter = null;

var emotions = ["negative", "positive", "mixed", "other"];

var emotionValues = new Array(emotions.length);

var popularUsers = d3.map();

var ratings = ["rating.1", "rating.2", "rating.3", "rating.4", "rating.5", "rating.6", "rating.7", "rating.8"];

var colors = ["244,109,67", "166,217,106", "254,196,79", "77,77,77"];

var tweets = [];

var similarities = [];

var sentiments = [];

var handlers = {};

var progressColor = "#9ecae1";

function wrapMessage(event, message) {
    var to_send = {};
    to_send["event"] = event;
    to_send["content"] = message;
    return JSON.stringify(to_send);
}

function registerHandlers(event, handler) {
    handlers[event] = handler;
}

function handleMessage(event, message) {
    if (event in handlers) {
        handlers[event](message);
    }
}

$(document).ready(function () {

    socket = new WebSocket("ws://" + location.hostname + ":" + location.port + "/websocket");

    socket.onopen = function () {
        socket.send(wrapMessage("js-client", "Hello"));
        socket.send(wrapMessage("request file", {content: dataFile, chunkSize: 10}));
    };

    socket.onmessage = function (message) {

        var message = JSON.parse(message["data"]);
        handleMessage(message["event"], message["content"]);

    };

    // $(window).on('beforeunload', function() {
    //     socket.onclose = function () { console.log ("socket closed"); }; // disable onclose handler first
    //     socket.close()
    //
    //     return "You should keep this page open.";
    // });


    for (var i = 0; i < 4; i++) {
        emotionValues[i] = 0;
    }

    registerHandlers("topic content", function (cache) {

        // var cache = JSON.parse(cache);

        var topics = [];

        cache.forEach(function (topic) {

            //translating string topic into a bunch of keyword distributions!
            var sTopic = [];

            var weights = topic.replace(" ", "").split("+");

            for (var i = 0; i < weights.length; i++) {

                var split = weights[i].split("*");
                var keyword = {
                    value: split[1],
                    weight: split[0]
                }

                sTopic.push(keyword);
            }
        });

        if (topicVis == null) {

            topicVis = new TopicChart({});

        }

        topicVis.draw(topics);

    });

    registerHandlers("spatial content", function (cache) {

        if (tweetScatter == null) {

            tweetScatter = new Scatter({});

        }

        tweetScatter.draw(cache);

    });

    //d3.select('#content-left').style("display", "block");

    var progressCurrentDiv = d3.select('#content-left').append("div")
        .attr("id", "progressDivCurrent")
        .style("background-color", progressColor)
        .style("height", "2%")
        .style("width", "0%")
        .style("display", "inline-block")
        .attr("align", "right");

    progressCurrentDiv.append("span").style("position", "relative")
        .style("top", "10%")
        .style("margin-right", "5px");

    var progressTotalDiv = d3.select('#content-left').append("div")
        .attr("id", "progressDivTotal")
        .style("background-color", "white")
        .style("height", "2%")
        .style("width", "100%")
        .style("display", "inline-block")
        .attr("align", "right");

    progressTotalDiv.append("span").style("position", "relative")
        .style("top", "10%");

    var tweetContentDiv = d3.select('#content-left').append("div")
        .attr("id", "contentDiv")
        .style("background-color", "white")
        .style("height", "97%")
        .style("width", "100%")
        .style("display", "inline-block")
        .style("overflow", "scroll");

    registerHandlers("file content", function (cache) {

        // var cache = JSON.parse(cache);
        var chunkId = cache["id"];
        var tweetChunk = cache["content"];
        var progress = cache["absolute-progress"];

        progressCurrentDiv.style("width", Math.round(progress["current"]*100/progress["total"])+"%");
        progressTotalDiv.style("width", 100 - Math.round(progress["current"]*100/progress["total"])+"%");

        progressCurrentDiv.select("span").text(Math.round(progress["current"]));
        progressTotalDiv.select("span").text(Math.round(progress["total"]));

        tweetChunk.forEach(function (tweetData, i) {

            // Adding tweet to the list
            var tweetId = ((cache.id - 1) * tweetChunk.length + i);

            tweetContentDiv.append("div")
                .style("background-color",
                    "rgba(" + colors[parseInt(tweetData["sentiment"]) - 1] + ",0.5)")
                .style("margin", "2px")
                .append("div")
                .style("margin-left", "10px")
                .style("padding-left", "2px")
                .style("background-color", "white")
                .text((tweetId + 1) + ": " + tweetData["content"]);

            socket.send(wrapMessage("request layout", {content: tweetId, chunkSize: 200}));

            // Processing the rating
            var ratingValue = +tweetData["sentiment"];
            sentiments.push(ratingValue - 1);

            if (!isNaN(ratingValue) && ratingValue > 0) {
                emotionValues[ratingValue - 1]++;
            }

            // counting the tweets
            if (popularUsers.has(tweetData["author"])) {

                popularUsers.set(tweetData["author"], popularUsers.get(tweetData["author"]) + 1);

            } else {

                popularUsers.set(tweetData["author"], 1);
            }

        });

        sentimentBar.draw(emotionValues, progress);

        users = popularUsers.entries().sort(function (a, b) {
            return b.value - a.value;
        }).slice(0, 15);

        userBar.draw(users, progress);

        // Automatially scroll to the bottom as new tweets are added
        var elem = document.getElementById('contentDiv');
        elem.scrollTop = elem.scrollHeight;

    });


    // Create sentiment bar chart
    sentimentBar = new Bar({
        emotions: emotions
    });

    // Create sentiment bar chart
    userBar = new HorizontalBar();

});


function HorizontalBar(options) {

    var _self = this;

    _self.progressCurrentDiv = d3.select('#userDiv').append("div")
        .attr("id", "progressDivCurrent")
        .style("background-color", progressColor)
        .style("height", "4%")
        .style("width", "0%")
        .style("display", "inline-block")
        .attr("align", "right");

    _self.progressCurrentDiv.append("span").style("position", "relative")
        .style("top", "10%")
        .style("margin-right", "5px");

    _self.progressTotalDiv = d3.select('#userDiv').append("div")
        .attr("id", "progressDivTotal")
        .style("background-color", "white")
        .style("height", "4%")
        .style("width", "100%")
        .style("display", "inline-block")
        .attr("align", "right");

    _self.progressTotalDiv.append("span").style("position", "relative")
        .style("top", "10%");

    _self.tweetContentDiv = d3.select('#userDiv').append("div")
        .attr("id", "contentUserDiv")
        .style("background-color", "white")
        .style("height", "96%")
        .style("width", "100%")
        .style("display", "inline-block")
        .style("overflow", "scroll");

    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 110
        },
        width = $("#contentUserDiv").width() - margin.left - margin.right,
        height = $("#contentUserDiv").height() - margin.top - margin.bottom;

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

    var svg = _self.svg = d3.select("#contentUserDiv").append("svg")
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

    _self.progressCurrentDiv.style("width", Math.round(progress["current"]*100/progress["total"])+"%")
    _self.progressTotalDiv.style("width", 100 - Math.round(progress["current"]*100/progress["total"])+"%")
    _self.progressCurrentDiv.select("span").text(Math.round(progress["current"]));
    _self.progressTotalDiv.select("span").text(Math.round(progress["total"]));

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


function Scatter(options) {

    var _self = this;

    _self.progressCurrentDiv = d3.select('#clusterDiv').append("div")
        .attr("id", "progressDivCurrent")
        .style("background-color", progressColor)
        .style("height", "2%")
        .style("width", "0%")
        .style("display", "inline-block")
        .style("vertical-align", "middle")
        .attr("align", "right");

    _self.progressCurrentDiv.append("span")
        .style("position", "relative")
        .style("top", "10%")
        .style("margin-right", "5px");

    _self.progressTotalDiv = d3.select('#clusterDiv').append("div")
        .attr("id", "progressDivTotal")
        .style("background-color", "white")
        .style("height", "2%")
        .style("width", "100%")
        .style("display", "inline-block")
        .style("vertical-align", "middle")
        .style("vertical-align", "middle")
        .attr("align", "right");

    _self.progressTotalDiv.append("span").style("position", "relative")
        .style("top", "10%");

    _self.tweetContentDiv = d3.select('#clusterDiv').append("div")
        .attr("id", "contentRightDiv")
        .style("background-color", "white")
        .style("height", "97%")
        .style("width", "100%")
        .style("display", "inline-block")
        .style("overflow", "scroll");

    var margin = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        },
        width = $("#contentRightDiv").width() - margin.left - margin.right,
        height = $("#contentRightDiv").height() - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var svg = _self.svg = d3.select("#contentRightDiv").append("svg")
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
                var xdomain = xSelection.map(_self.x.invert).sort(function (a, b){return a - b;});
                var ydomain = ySelection.map(_self.y.invert).sort(function (a, b){return a - b;});
                console.log(d3.event.selection);
                console.log(xdomain);
                console.log(ydomain);

                if (_self.data) {
                    var ids = [];
                    var brushed = _self.data.filter(function (d) {
                        if (d["content"][0] >= xdomain[0] && d["content"][0] <= xdomain[1]) {
                            if (d["content"][1] >= ydomain[0] && d["content"][1] <= ydomain[1]) {
                                ids.push(d["id"]);
                                return true;
                            }
                        }
                        return false;
                    });
                    console.log(ids);

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

    _self.progressCurrentDiv.style("width", Math.round(progress["current"]*100/progress["total"])+"%")
    _self.progressTotalDiv.style("width", 100 - Math.round(progress["current"]*100/progress["total"])+"%")
    _self.progressCurrentDiv.select("span").text(Math.round(progress["current"]));
    _self.progressTotalDiv.select("span").text(Math.round(progress["total"]));

    _self.x.domain(d3.extent(_self.data, function (d) {
        return d["content"][0];
    }));

    _self.y.domain(d3.extent(_self.data, function (d) {
        return d["content"][1];
    }));

    // draw dots
    var circles = _self.svg.selectAll(".dot")
        .data(_self.data, function (d, i) {
            return d["id"];
        });

    circles.enter()
        .append("circle")
        .transition()
        .duration(200)
        .attr("id", function (d, i) {
            return "l"+d["id"];
        })
        .attr("class", "dot")
        .attr("r", 3.5)
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

function Bar(options) {

    var _self = this;

    _self.progressCurrentDiv = d3.select('#sentimentDiv').append("div")
        .attr("id", "progressDivCurrent")
        .style("background-color", progressColor)
        .style("height", "4%")
        .style("width", "0%")
        .style("display", "inline-block")
        .style("vertical-align", "middle")
        .attr("align", "right");

    _self.progressCurrentDiv.append("span").style("position", "relative")
        .style("top", "10%").style("margin-right", "5px");

    _self.progressTotalDiv = d3.select('#sentimentDiv').append("div")
        .attr("id", "progressDivTotal")
        .style("background-color", "white")
        .style("height", "4%")
        .style("width", "100%")
        .style("display", "inline-block")
        .style("vertical-align", "middle")
        .attr("align", "right");

    _self.progressTotalDiv.append("span").style("position", "relative")
        .style("top", "10%");

    _self.tweetContentDiv = d3.select('#sentimentDiv').append("div")
        .attr("id", "contentSentimentDiv")
        .style("background-color", "white")
        .style("height", "96%")
        .style("width", "100%")
        .style("display", "inline-block")
        .style("overflow", "scroll");

    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 40
        },
        width = $("#contentSentimentDiv").width() - margin.left - margin.right,
        height = $("#contentSentimentDiv").height() - margin.top - margin.bottom;

    _self.width = width;
    _self.height = height;

    var x = _self.x = d3.scaleBand()
        .range([0, width])
        .paddingOuter(0.2)
        .paddingInner(0.2);

    var y = _self.y = d3.scaleLinear()
        .range([height, 0]);

    var xAxis = d3.axisBottom(x);

    var yAxis = d3.axisLeft(y)
        .ticks(10);

    var svg = _self.svg = d3.select("#contentSentimentDiv").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(options.emotions);

    y.domain([0, 1500]);

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

Bar.prototype.draw = function (data, progress) {

    var _self = this;

    _self.progressCurrentDiv.style("width", Math.round(progress["current"]*100/progress["total"])+"%")
    _self.progressTotalDiv.style("width", 100 - Math.round(progress["current"]*100/progress["total"])+"%")
    _self.progressCurrentDiv.select("span").text(Math.round(progress["current"]));
    _self.progressTotalDiv.select("span").text(Math.round(progress["total"]));

    var barSelection = _self.svg.selectAll(".bar")
        .data(data);

    barSelection
        .transition().duration(10)
        .attr("x", function (d, i) {
            return _self.x(emotions[i]);
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

    data.forEach(function (d, i) {
        _self.svg.append("line")
            .attr("class", "cap")
            .attr("x1", _self.x(emotions[i]))
            .attr("x2", _self.x(emotions[i]) - 5)
            .attr("y1", _self.y(d))
            .attr("y2", _self.y(d))
            .attr("stroke-width", 1)
            .attr("stroke", "#222")
            .attr("stroke-opacity", 0.5);
    });
}
