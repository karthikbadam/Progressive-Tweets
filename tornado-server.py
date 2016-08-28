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
from nltk.stem import WordNetLemmatizer
import gensim
from gensim import corpora, models
import logging

## Logging all the messages
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
logger = logging.getLogger(__name__)

## Global variables
renderStop = False
layoutStop = False
contentCache = []
layoutCache = []
totalLines = 1

bin2DRows = 25
bin2DCols = 25

# thread_pool = ProcessPoolExecutor(100)
thread_pool = ThreadPoolExecutor(200)
distance = np.zeros([1, 1])

## -------------------------------------------------------------------
stemmer = PorterStemmer()
wordnetLemmatizer = WordNetLemmatizer()


def jaccard(tweet1, tweet2):
    ## lemmatize before finding jaccard distance
    # for i in range(0, len(tweet1)):
    #     print str(tweet1[i])
    #     tweet1[i] = wordnetLemmatizer.lemmatize(tweet1[i])
    #     tweet1[i] = stemmer.stem(tweet1[i])
    #     print "After " + str(tweet1[i])
    #
    # for i in range(0, len(tweet2)):
    #     tweet2[i] = wordnetLemmatizer.lemmatize(tweet2[i])
    #     tweet2[i] = stemmer.stem(tweet2[i])
    set_1 = set(tweet1)
    set_2 = set(tweet2)

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
freq_words = ['http', 'https', 'amp', 'com', 'co', 'th', 'tweetdebate', 'debate', 'mccain', 'obama']
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
        if temp[word][0].lower() not in stopset and temp[word][1] in ["NN", "NNP", "NNS", "NNPS", "VBD", "VB", "VBG",
                                                                      "VBN",
                                                                      "VBP", "VBZ"]:
            currentDoc.append(wordnetLemmatizer.lemmatize(temp[word][0].lower()))

    # bigrams = ngrams(nltk.word_tokenize(tweet.lower().strip()), 2)
    bigrams = list(ngrams(currentDoc, 2))

    newDoc = []
    for bigram in bigrams:
        newDoc.append(bigram[0] + " " + bigram[1])
        currentDoc.append(bigram[0] + " " + bigram[1])

    # bigrams = ngrams(nltk.word_tokenize(tweet.lower().strip()), 2)
    # trigrams = list(ngrams(currentDoc, 3))
    #
    # for trigram in trigrams:
    #     newDoc.append(trigram[0] + " " + trigram[1] + " " + trigram[2])
    #     currentDoc.append(trigram[0] + " " + trigram[1] + " " + trigram[2])

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

    totalSize = os.path.getsize("public/data/" + filename)
    bytesRead = 0.0

    lineNumber = 1.0
    chunkBytes = 0.0

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
                totalLines = int(round((linesRead / bytesRead) * totalSize))
                chunkBytes = chunkBytes + len(line)

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
                        "total": totalLines,
                        "relative": chunkBytes
                    }

                    if renderStop == True:
                        break

                    client.send_message("file content", message)

                    cache = []
                    counter = 1
                    chunkBytes = 0

                time.sleep(0.04)

                lineNumber = lineNumber + 1

    totalLines = linesRead


def sliceTweets(data):
    global contentCache
    index = data["content"]
    return data["chunkSize"], contentCache[:index], contentCache[index]


def tokenizeTweets(data):
    return generateKeywords(data["content"])


def layoutGenerationProgressive(data, client):
    global distance
    global layoutCache

    chunkSize, tweetsCopy, current = sliceTweets(data)
    size = data["content"] + 1

    if size == 1:
        distance[0][0] = 0
    else:
        distance.resize(size, size)

        for i, cTweet in enumerate(tweetsCopy):
            # distance[size - 1][i] = jaccard(set(cTweet["keywords"]), set(current["keywords"]))
            # distance[i][size - 1] = jaccard(set(cTweet["keywords"]), set(current["keywords"]))
            distance[size - 1][i] = jaccard(cTweet["keywords"], current["keywords"])
            distance[i][size - 1] = jaccard(cTweet["keywords"], current["keywords"])

        distance[size - 1][size - 1] = 0

    layoutPacketCounter = size

    # print "total lines is ----------------------------------------------------------- " + str(
    #    layoutPacketCounter) + " -- " + str(totalLines)

    if (layoutPacketCounter % chunkSize == 0 and layoutPacketCounter >= chunkSize) \
            or layoutPacketCounter == totalLines - 1:
        # tfidf = TfidfVectorizer().fit_transform(tweetsCopy)
        # similarities = linear_kernel(tfidf, tfidf)

        model = TSNE(n_components=2, init='pca', random_state=1, method='barnes_hut', n_iter=200, verbose=2)
        spatialData = model.fit_transform(np.copy(distance))
        spatialLayout = spatialData.tolist()

        layouts = []

        # group points into bins to create a heatmap
        # each has 1/100 size of the total width or height
        # 20 rows and 20 columns
        matrix = []
        for i in range(0, bin2DRows):
            matrixRow = []
            for j in range(0, bin2DCols):
                element = {}
                element["density"] = 0
                element["points"] = []
                matrixRow.append(element)
            matrix.append(matrixRow)

        xMin = 100000000
        xMax = -10000000
        yMin = 100000000
        yMax = -10000000

        for i, l in enumerate(spatialLayout):
            if l[0] > xMax:
                xMax = l[0]
            if l[0] < xMin:
                xMin = l[0]
            if l[1] > yMax:
                yMax = l[1]
            if l[1] < yMin:
                yMin = l[1]

        # construct the layout matrix?
        for i, l in enumerate(spatialLayout):
            col = int(min(math.floor((l[0] - xMin) / (xMax - xMin) * bin2DCols), bin2DCols - 1))
            row = int(min(math.floor((l[1] - yMin) / (yMax - yMin) * bin2DRows), bin2DRows - 1))
            matrix[row][col]["density"] = matrix[row][col]["density"] + 1
            matrix[row][col]["points"].append({
                "id": i,
                "content": l
            })
            # datum = {}
            # datum["id"] = i
            # datum["content"] = l
            # layouts.append(datum)

        # flatten the layout matrix
        for i in range(0, bin2DRows):
            for j in range(0, bin2DCols):
                if matrix[i][j]["density"] != 0:
                    datum = {}
                    datum["row"] = i
                    datum["col"] = j
                    datum["content"] = matrix[i][j]["density"]
                    layouts.append(datum)

        returnData = {}
        returnData["content"] = layouts

        layoutCache = matrix

        returnData["absolute-progress"] = {
            "current": layoutPacketCounter,
            "total": totalLines,
            "relative": layoutPacketCounter
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
    ids = message["content"]


@gen.coroutine
def handleEvent(client, event, message):
    logger.info("event " + str(event))
    if event == "request file":
        future = thread_pool.submit(readFileProgressive, message, client)

    if event == "request layout":
        future = thread_pool.submit(layoutGenerationProgressive, message, client)

    if event == "request tweets":
        future = thread_pool.submit(layoutGenerationProgressive, message, client)

    if event == "request keywords":
        ids = message["content"]
        returnKeywords = []

        for points in layoutCache[ids["row"]][ids["col"]]["points"]:
            print str(ids)
            returnKeywords.extend(contentCache[points["id"]]["keywords"])

        ## ids has row and col
        # for index in ids:
        #     returnKeywords.extend(contentCache[index]["keywords"])

        message = {}
        message["id"] = 1
        message["content"] = returnKeywords
        message["absolute-progress"] = {
            "current": 100,
            "total": 100,
            "relative": len(returnKeywords)
        }
        client.send_message("keyword content", message)


class SocketHandler(tornado.websocket.WebSocketHandler):
    # other methods
    def open(self):
        logger.info("Connection opened")

    @gen.coroutine
    def initialize(self):
        logger.info("Connection initiated")

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
