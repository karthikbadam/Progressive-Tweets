import Settings
import tornado.escape
import tornado.ioloop
import tornado.web as web
import tornado.websocket
from tornado import gen
from tornado import iostream
import tornadis
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

import math
import os.path
import os, sys
import json
import time
import numpy as np
from tornado.ioloop import IOLoop

from sklearn.manifold import TSNE
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import re, nltk, json
from nltk import ngrams
from nltk.stem.porter import PorterStemmer
from nltk.corpus import stopwords
from gensim import corpora, models
import gensim
import logging

## Logging all the messages
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
logger = logging.getLogger(__name__)

## Global variables
renderStop = False
layoutStop = False
contentCache = []
totalLines = 1

# thread_pool = ProcessPoolExecutor(100)
thread_pool = ThreadPoolExecutor(200)
distance = np.zeros([1, 1])

## -------------------------------------------------------------------
stemmer = PorterStemmer()


def jaccard(set_1, set_2):
    return 1 - len(set_1.intersection(set_2)) / float(len(set_1.union(set_2)))


def stem_tokens(tokens, stemmer):
    stemmed = []
    for item in tokens:
        stemmed.append(stemmer.stem(item))
    return stemmed


def tokenize(text):
    text = re.sub("[^a-zA-Z]", " ", text)  # Removing numbers and punctuation
    text = re.sub(" +", " ", text)  # Removing extra white space
    text = re.sub("\\b[a-zA-Z0-9]{10,100}\\b", " ", text)  # Removing very long words above 10 characters
    text = re.sub("\\b[a-zA-Z0-9]{0,1}\\b", " ", text)  # Removing single characters (e.g k, K)

    tokens = nltk.word_tokenize(text.strip())
    tokens = nltk.pos_tag(tokens)
    return tokens


stopset = stopwords.words('english')
freq_words = ['http', 'https', 'amp', 'com', 'co', 'th', 'tweetdebate', 'debate']
for i in freq_words:
    stopset.append(i)

textCorpus = []


def generateKeywords(tweet):
    tweet = re.sub("[^a-zA-Z]", " ", tweet)  # Removing numbers and punctuation
    tweet = re.sub(" +", " ", tweet)  # Removing extra white space
    tweet = re.sub("\\b[a-zA-Z0-9]{0,1}\\b", " ", tweet)  # Removing single characters (e.g k, K)
    temp = nltk.word_tokenize(tweet.strip())
    temp = nltk.pos_tag(temp)

    currentDoc = []
    for word in range(len(temp)):
        if temp[word][0] not in stopset and temp[word][1] in ["NN", "NNP", "NNS", "NNPS", "VBD", "VB", "VBG", "VBN",
                                                              "VBP", "VBZ"]:
            currentDoc.append(temp[word][0].lower())

    # bigrams = ngrams(nltk.word_tokenize(tweet.lower().strip()), 2)
    bigrams = list(ngrams(currentDoc, 2))

    newDoc = []

    for bigram in bigrams:
        newDoc.append(bigram[0] + " " + bigram[1])
        currentDoc.append(bigram[0] + " " + bigram[1])

    return currentDoc
    # return newDoc


def generate(tweet):
    temp = tokenize(tweet)
    currentDoc = []
    for word in range(len(temp)):
        if temp[word][0] not in stopset and temp[word][1] == 'NN':
            currentDoc.append(temp[word][0])

        textCorpus.append(currentDoc)


def analyzeTopic():
    dictionary = corpora.Dictionary(textCorpus)
    corpus = [dictionary.doc2bow(text) for text in textCorpus]

    ldamodel = gensim.models.ldamodel.LdaModel(corpus, num_topics=3, id2word=dictionary, passes=60)

    print 'Topics are'

    topics = []
    for i in range(0, ldamodel.num_topics - 1):
        print ldamodel.print_topic(i)
        topics.append(ldamodel.print_topic(i))

    print '\n'
    # send('topics information', topics)


def analyzeTSNE(X):
    model = TSNE(n_components=2, init='pca', random_state=1, method='barnes_hut', n_iter=300, verbose=2)
    return model.fit_transform(X)


## Currently for csv files or tsv files
@gen.coroutine
def readFileProgressive(data, client):
    global renderStop
    global totalLines
    filename = data["content"]
    chunkSize = data["chunkSize"]
    counter = 0
    cache = []
    colnames = ""
    chunkCounter = 0

    statinfo = os.stat("public/data/" + filename)
    totalSize = statinfo.st_size
    totalSize = os.path.getsize("public/data/" + filename)
    bytesRead = 0.0

    lineNumber = 1.0

    with open("public/data/" + filename, 'r') as infile:
        for line in infile:
            if counter == 0:
                colnames = line.strip().split("\t")
                totalSize = totalSize - sys.getsizeof(line)
                counter = 1
            else:
                tweetDatum = {}

                bytesRead = bytesRead + len(line)
                linesRead = lineNumber
                totalLines = (linesRead / bytesRead) * totalSize

                values = line.strip().split("\t")
                for i, value in enumerate(values):
                    tweetDatum[colnames[i]] = unicode(value, errors='ignore')

                cache.append({"content": tweetDatum["content"],
                              "sentiment": tweetDatum["rating.1"],
                              "author": tweetDatum["author.name"],
                              "id": counter - 1})

                counter = counter + 1

                ## maintain a cache of the data
                ## Lets add keywords right here
                tweetDatum["keywords"] = tokenizeTweets(tweetDatum)

                if len(contentCache) < lineNumber:
                    contentCache.append(tweetDatum)

                if counter % chunkSize == 1 and counter >= chunkSize:
                    chunkCounter = chunkCounter + 1

                    message = {}
                    message["id"] = chunkCounter
                    message["content"] = cache
                    message["absolute-progress"] = {
                        "current": linesRead,
                        "total": totalLines
                    }

                    if renderStop == True:
                        break

                    client.send_message("file content", message)

                    cache = []
                    counter = 1

                time.sleep(0.04)

                lineNumber = lineNumber + 1


## Progressive t-SNE for layout generation
# def appendTweets (data):
#     global tweets
#     tweet = data["content"]
#     if tweet not in tweets:
#         tweets.append(tweet)
#     return data["chunkSize"], tweets[:]

def sliceTweets(data):
    global contentCache
    index = data["content"]
    return data["chunkSize"], contentCache[:index], contentCache[index]


def tokenizeTweets(data):
    return generateKeywords(data["content"])


def layoutGenerationProgressive(data, client):
    global distance

    chunkSize, tweetsCopy, current = sliceTweets(data)
    size = data["content"] + 1

    if size == 1:
        distance[0][0] = 0
    else:
        distance.resize(size, size)

        for i, cTweet in enumerate(tweetsCopy):
            distance[size - 1][i] = jaccard(set(cTweet["keywords"]), set(current["keywords"]))
            distance[i][size - 1] = jaccard(set(cTweet["keywords"]), set(current["keywords"]))

        distance[size - 1][size - 1] = 0

    layoutPacketCounter = size

    if layoutPacketCounter % chunkSize == 0 and layoutPacketCounter >= chunkSize:
        # tfidf = TfidfVectorizer().fit_transform(tweetsCopy)
        # similarities = linear_kernel(tfidf, tfidf)

        model = TSNE(n_components=2, init='pca', random_state=1, method='barnes_hut', n_iter=200, verbose=2)
        spatialData = model.fit_transform(np.copy(distance))
        spatialLayout = spatialData.tolist()

        layouts = []
        for i, l in enumerate(spatialLayout):
            datum = {}
            datum["id"] = i
            datum["content"] = l
            layouts.append(datum)

        returnData = {}
        returnData["content"] = layouts
        returnData["absolute-progress"] = {
            "current": layoutPacketCounter,
            "total": totalLines
        }

        client.send_message('spatial content', returnData)


## Progressive topic modeling
def topicModellingProgressive(data, client):
    global layoutStop

    tweet = data["content"]
    chunkSize = data["chunkSize"]
    cache = []
    counter = 0
    colnames = ""
    chunkCounter = 0

    cache.append(tweet)
    counter = counter + 1

    if counter % chunkSize == 1 and counter >= chunkSize:
        chunkCounter = chunkCounter + 1
        generate(cache)
        cache = []


## -------------------------------------------------------------------
## Working with websockets

clients = []


def wrapMessage(event, message):
    msgObject = {}
    msgObject["event"] = event
    msgObject["content"] = message
    return json.dumps(msgObject)


def unWrapMessage(message):
    message = json.loads(message)
    event = message["event"]
    data = message["content"]
    return event, data


def keywordDistribution(message):
    print "I AM HERE 2!----------------------------------------------------------!!!" + str(message)
    ids = message["content"]


@gen.coroutine
def handleEvent(client, event, message):
    logger.info("event " + str(event))
    if event == "request file":
        future = thread_pool.submit(readFileProgressive, message, client)

    if event == "request layout":
        # message["keywords"] = tokenizeTweets(message)
        future = thread_pool.submit(layoutGenerationProgressive, message, client)

    if event == "request tweets":
        # message["keywords"] = tokenizeTweets(message)
        future = thread_pool.submit(layoutGenerationProgressive, message, client)

    if event == "request keywords":
        ids = message["content"]
        returnKeywords = []
        for index in ids:
            returnKeywords.extend(contentCache[index]["keywords"])

        message = {}
        message["id"] = 1
        message["content"] = returnKeywords
        message["absolute-progress"] = {
            "current": 100,
            "total": 100
        }
        client.send_message("keyword content", message)


class SocketHandler(tornado.websocket.WebSocketHandler):
    # other methods
    def open(self):
        logger.info("Connection opened")

    @gen.coroutine
    def initialize(self):
        logger.info("Connection initiated")
        # self.redis = tornadis.Client()
        # loop = tornado.ioloop.IOLoop.current()
        # loop.add_callback(self.watch_redis)

    # @gen.coroutine
    # def watch_redis(self):
    #     while True:
    #         response = yield self.redis.call('BLPOP', 'ws-queue', 0)
    #         self.write_message(response[1])

    def on_message(self, message):
        event, message = unWrapMessage(message)

        if event == "js-client":
            logger.info("Received connection registration message")
            clients.append(self)

        handleEvent(self, event, message)

    def on_close(self):
        if self in clients:
            logger.info("Connection closed")
            clients.remove(self)

    def send_message_to_all(self, event, message):
        to_send = wrapMessage(event, message)
        for c in clients:
            c.write_message(message)

    def send_message_to_one(self, client, event, message):
        to_send = wrapMessage(event, message)
        client.write_message(to_send)

    @gen.coroutine
    def send_message(self, event, message):
        logger.info("event " + str(event))
        to_send = wrapMessage(event, message)
        self.write_message(to_send)


## -------------------------------------------------------------------
## Working with http hosting the html, js
class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r'/', SentimentHandler),
            (r'/sentiment', SentimentHandler),
            (r'/load', LoadHandler),
            (r'/topic', TopicHandler),
            (r'/websocket', SocketHandler),
            (r'/(.*)', web.StaticFileHandler, {'path': Settings.STATIC_PATH}),
        ]
        settings = {
            "template_path": Settings.TEMPLATE_PATH,
            "static_path": Settings.STATIC_PATH,
        }
        tornado.web.Application.__init__(self, handlers, **settings)


class SentimentHandler(tornado.web.RequestHandler):
    @gen.coroutine
    def get(self):
        self.render("sentiment.html")


class LoadHandler(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def get(self):
        self.render("load.html")


class TopicHandler(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def get(self):
        self.render("topic.html")


# if __name__ == "__main__":
def main():
    application = Application()
    application.listen(3000)
    tornado.ioloop.IOLoop.instance().start()


# tornado.ioloop.IOLoop.instance().run_sync(main)
main()
