/**
 * Created by Karthik on 7/19/16.
 */

var socket;

var dataFile = "twitter_debate.txt";

var sentimentBar, userBar, tweetScatter, list = null;

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

            tweetScatter = new Heatmap({});

        }

        tweetScatter.draw(cache);

    });

    registerHandlers("keyword content", function (cache) {

        console.log(cache);

        tweetScatter.drawKeywords(cache["content"]);
    });

    registerHandlers("tweets content", function (cache) {

        console.log(cache);

    });

    registerHandlers("file content", function (cache) {

        var chunkId = cache["id"];
        var progress = cache["absolute-progress"];
        var tweetChunk = cache["content"];

        list.draw(cache);

        tweetChunk.forEach(function (tweetData, i) {

            // Adding tweet to the list
            var tweetId = ((cache.id - 1) * tweetChunk.length + i);

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


