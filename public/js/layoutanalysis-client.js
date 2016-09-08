/**
 * Created by Karthik on 7/19/16.
 */

var socket;

//var dataFile = "general_debate2008.txt";
var dataFile = "republican_debate2016.txt";

var sentimentBar, userBar, textScatter, list = null;

var commonButtons = null;

var emotions = ["Negative",  "Neutral", "Positive"];

var emotionValues = new Array(emotions.length);

var popularUsers = d3.map();

var colors = ["244,109,67", "254,196,79", "166,217,106", "77,77,77"];

var sentiments = [];

var handlers = {};

var progressColor = "#c6dbef";

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
        socket.send(wrapMessage("request file", {content: dataFile, chunkSize: 5}));
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

        if (textScatter == null) {
            textScatter = new Heatmap({});
        }

        textScatter.draw(cache);

    });

    registerHandlers("keyword content", function (cache) {

        console.log(cache);

        textScatter.drawKeywords(cache["content"]);
    });

    registerHandlers("texts content", function (cache) {

        console.log(cache);
        if (!commonButtons.pauseFlag) {
            commonButtons.pause();
        }

        textScatter.drawKeywords(cache["content"], true);

        // process users into an array
        userBar.highlight(cache);

        // process sentiments into an array
        sentimentBar.highlight(cache);

        // process tweets into an array
        list.highlight(cache);


    });

    registerHandlers("file content", function (cache) {

        list.draw(cache);

    });

    registerHandlers("sentiment content", function (cache) {

        sentimentBar.draw(cache);

    });

    registerHandlers("user content", function (cache) {

        userBar.draw(cache);

    });

    // Create Tweet List
    list = new List();

    // Create sentiment bar chart
    sentimentBar = new Bar({
        emotions: emotions
    });

    // Create sentiment bar chart
    userBar = new HorizontalBar();


    // create common buttons
    commonButtons = new  CommonButtons();

});

function CommonButtons() {

    var _self = this;

    d3.select("#common-buttons").style("float", "right").style("padding-top", "5px");

    _self.pauseFlag = false;

    _self.stopFlag = false;

    Feedback.addControlMinimize("common-buttons", _self);

    _self.miniControlDiv
        .style("position", "relative")
        .style("margin-left", "0px");
}

CommonButtons.prototype.pause = function () {

    var _self = this;
    _self.pauseFlag = !_self.pauseFlag;

    socket.send(wrapMessage("pause interface", ""));

    list.pause();
    sentimentBar.pause();
    userBar.pause();

    if (textScatter != null)
        textScatter.pause();

    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
    }
}

CommonButtons.prototype.stop = function () {
    var _self = this;
    _self.stopFlag = !_self.stopFlag;

    list.stop();
    sentimentBar.stop();
    userBar.stop();

    if (textScatter != null)
        textScatter.stop();


    if (_self.stopFlag) {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/stop.png")');
    }
}

CommonButtons.prototype.forward = function () {
    var _self = this;

    list.forward();
    sentimentBar.forward();
    userBar.forward();

    if (textScatter != null)
        textScatter.forward();

}

CommonButtons.prototype.rewind = function () {
    var _self = this;
    list.rewind();
    sentimentBar.rewind();
    userBar.rewind();

    if (textScatter != null)
        textScatter.rewind();

}