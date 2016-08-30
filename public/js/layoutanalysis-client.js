/**
 * Created by Karthik on 7/19/16.
 */

var socket;

var dataFile = "twitter_debate.txt";

var sentimentBar, userBar, textScatter, list = null;

var emotions = ["negative", "positive", "mixed", "other"];

var emotionValues = new Array(emotions.length);

var popularUsers = d3.map();

var colors = ["244,109,67", "166,217,106", "254,196,79", "77,77,77"];

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

    registerHandlers("tweets content", function (cache) {

        console.log(cache);
        textScatter.pause();

        // process users into an array
        userBar.pause();
        userBar.highlight(cache);

        // process sentiments into an array
        sentimentBar.pause();
        sentimentBar.highlight(cache);

        // process tweets into an array
        list.pause();
        list.draw(cache);


    });

    registerHandlers("file content", function (cache) {

        list.draw(cache);

        sentimentBar.draw(cache);

        userBar.draw(cache);

    });

    // Create Tweet List
    list = new List ();

    // Create sentiment bar chart
    sentimentBar = new Bar({
        emotions: emotions
    });

    // Create sentiment bar chart
    userBar = new HorizontalBar();

});


