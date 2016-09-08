import Settings
import tornado.escape
import tornado.ioloop
import tornado.web as web
import tornado.websocket
from tornado import gen
import random
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
from sklearn.manifold import MDS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import re, nltk, json
from nltk import ngrams
from nltk.stem.porter import PorterStemmer
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet
import gensim
from gensim import corpora, models
import logging
from itertools import product
from vaderSentiment.vaderSentiment import sentiment as vaderSentiment

## Logging all the messages
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
logger = logging.getLogger(__name__)

## Global variables
renderStop = False
layoutStop = False
pauseInterface = False
revertInterface = False
stopInterface = False

contentCache = []
layoutCache = []
totalLines = 1

bin2DRows = 80
bin2DCols = 40

distancetexts = np.zeros([1, 1])

# thread_pool = ProcessPoolExecutor(100)
thread_pool = ThreadPoolExecutor(200)

## -------------------------------------------------------------------
stemmer = PorterStemmer()
wordnetLemmatizer = WordNetLemmatizer()

# Columns in the text dataset -- republican dataset
sentimentCol = "sentiment"
authorNameCol = "name"
textContentCol = "text"



# # Columns in the text dataset -- general dataset
# sentimentCol = "rating.1"
# authorNameCol = "author.name"
# textContentCol = "content"

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
freq_words = ['http', 'https', 'amp', 'com', 'co', 'th', 'textdebate', 'debate', 'mccain', 'obama', 'gopdebate',
              'gopdebates', 'rt']
for i in freq_words:
    stopset.append(i)

textCorpus = []


def generateKeywords(text):
    text = re.sub("[^a-zA-Z]", " ", text)  # Removing numbers and punctuation
    text = re.sub(" +", " ", text)  # Removing extra white space
    text = re.sub("\\b[a-zA-Z0-9]{0,1}\\b", " ", text)  # Removing single characters (e.g k, K)
    temp = nltk.word_tokenize(text.strip())
    temp = nltk.pos_tag(temp)

    currentDoc = []
    for word in range(len(temp)):
        if temp[word][0].lower() not in stopset and temp[word][1] in ["NN", "NNP", "NNS", "NNPS", "VBD", "VB", "VBG",
                                                                      "VBN", "VBP", "VBZ"]:
            # lemmatized
            synsets = wordnet.synsets(temp[word][0].lower())
            if len(synsets) > 0:
                currentDoc.append(synsets[0].name().split(".")[0])
            else:
                currentDoc.append(temp[word][0].lower())

    # bigrams = ngrams(nltk.word_tokenize(text.lower().strip()), 2)
    # bigrams = list(ngrams(currentDoc, 2))

    # newDoc = []
    # for bigram in bigrams:
    #     newDoc.append(bigram[0] + " " + bigram[1])
    #     currentDoc.append(bigram[0] + " " + bigram[1])

    # bigrams = ngrams(nltk.word_tokenize(text.lower().strip()), 2)
    # trigrams = list(ngrams(currentDoc, 3))
    #
    # for trigram in trigrams:
    #     newDoc.append(trigram[0] + " " + trigram[1] + " " + trigram[2])
    #     currentDoc.append(trigram[0] + " " + trigram[1] + " " + trigram[2])

    return currentDoc


def generate(text):
    temp = tokenize(text)
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

    lineNumber = 1
    chunkBytes = 0.0

    ## Line index of the last element in the current chunk
    ## This is controlled by the client
    playHead = 1

    with open("public/data/" + filename, 'r') as infile:
        for line in infile:
            if counter == 0:
                colnames = line.strip().split("\t")
                totalSize = totalSize - sys.getsizeof(line)
                counter = 1
            else:
                textDatum = {}

                while pauseInterface:
                    logger.info("system paused")

                ## -------------------------------------
                ## For when the play head is changed
                counter2 = 0
                chunkCounter2 = 0
                cache2 = []
                chunkBytes2 = 0
                while playHead < lineNumber:
                    cache2.append(contentCache[playHead - 1])
                    chunkBytes2 += contentCache[playHead - 1]["bytes"]
                    if counter2 % chunkSize == 1 and counter2 >= chunkSize:
                        chunkCounter2 += 1

                        message = {}
                        message["id"] = chunkCounter2
                        message["content"] = cache2
                        message["absolute-progress"] = {
                            "current": playHead,
                            "total": totalLines,
                            "relative": chunkBytes2
                        }

                        client.send_message("file content", message)

                        cache2 = []
                        chunkBytes2 = 0

                    playHead += 1
                ## -------------------------------------

                ## -------------------------------------
                ## For when the revert operation is selected
                counter2 = 0
                chunkCounter2 = 0
                cache2 = []
                chunkBytes2 = 0
                while playHead > 0 and revertInterface:
                    cache2.append(contentCache[playHead - 1])
                    chunkBytes2 += contentCache[playHead - 1]["bytes"]
                    if counter2 % chunkSize == 1 and counter2 >= chunkSize:
                        chunkCounter2 += 1

                        message = {}
                        message["id"] = chunkCounter2
                        message["content"] = cache2
                        message["absolute-progress"] = {
                            "current": playHead,
                            "total": totalLines,
                            "relative": chunkBytes2
                        }

                        client.send_message("file content", message)

                        cache2 = []
                        chunkBytes2 = 0

                    playHead += 1
                ## -------------------------------------

                ## -------------------------------------
                ## For when the forward operation is selected
                counter2 = 0
                chunkCounter2 = 0
                cache2 = []
                chunkBytes2 = 0
                while playHead < lineNumber:
                    cache2.append(contentCache[playHead - 1])
                    chunkBytes2 += contentCache[playHead - 1]["bytes"]
                    if counter2 % chunkSize == 1 and counter2 >= chunkSize:
                        chunkCounter2 += 1

                        message = {}
                        message["id"] = chunkCounter2
                        message["content"] = cache2
                        message["absolute-progress"] = {
                            "current": playHead,
                            "total": totalLines,
                            "relative": chunkBytes2
                        }

                        client.send_message("file content", message)

                        cache2 = []
                        chunkBytes2 = 0

                    playHead += 1
                ## -------------------------------------

                ## -------------------------------------
                ## For when the stop operation is selected
                if stopInterface == True:
                    stopInterface = False
                    playHead = 1
                ## -------------------------------------

                bytesRead = bytesRead + len(line)
                linesRead = lineNumber
                totalLines = int(round((linesRead / bytesRead) * totalSize))
                chunkBytes = chunkBytes + len(line)

                values = line.strip().split("\t")
                for i, value in enumerate(values):
                    textDatum[colnames[i]] = unicode(value, errors='ignore')

                textDatumOut = {}
                textDatumOut["id"] = lineNumber - 1
                textSentimentVader = vaderSentiment(textDatum[textContentCol])
                # {'neg': 0.0, 'neu': 0.254, 'pos': 0.746, 'compound': 0.8316}

                textDatumOut["sentiment"] = "Positive" if textSentimentVader["compound"] > 0.25 else "Negative" if \
                    textSentimentVader["compound"] < -0.25 else "Neutral"
                textDatumOut["content"] = textDatum[textContentCol]
                textDatumOut["author"] = textDatum[authorNameCol]
                textDatumOut["textId"] = textDatum["id"]
                textDatumOut["keywords"] = tokenizetexts({"content": textDatum[textContentCol]})
                textDatumOut["bytes"] = len(line)

                if len(contentCache) < lineNumber:
                    contentCache.append(textDatumOut)

                cache.append({"content": textDatumOut["content"],
                              "sentiment": textDatumOut["sentiment"],
                              "author": textDatumOut["author"],
                              "textId": textDatumOut["textId"],
                              "id": counter - 1})

                counter = counter + 1

                # compute distance2
                if lineNumber == 1:
                    distancetexts[0][0] = 0
                else:
                    if lineNumber > distancetexts.shape[0]:
                        distancetexts.resize(totalLines, totalLines)
                    for i, ctext in enumerate(contentCache):
                        # distance2[lineNumber - 1][i] = jaccard(ctext["keywords"], textDatumOut["keywords"])
                        # distance2[lineNumber - 1][i] = semantic(ctext["syncset"], textDatumOut["syncset"])
                        distancetexts[lineNumber - 1][i] = semantic(ctext["keywords"], textDatumOut["keywords"])
                        distancetexts[i][lineNumber - 1] = distancetexts[lineNumber - 1][i]
                    distancetexts[lineNumber - 1][lineNumber - 1] = 0

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

                    if renderStop:
                        break

                    client.send_message("file content", message)

                    cache = []
                    counter = 1
                    chunkBytes = 0

                time.sleep(0.05)

                lineNumber += 1
                playHead += 1

    totalLines = linesRead


def slicetexts(data):
    global contentCache
    index = data["content"]
    return data["chunkSize"], contentCache[:index], contentCache[index]


def tokenizetexts(data):
    return generateKeywords(data["content"])


def jaccard(list1, list2):
    ## lemmatize before finding jaccard distance
    # for i in range(0, len(list1)):
    #     list1[i] = wordnetLemmatizer.lemmatize(list1[i])
    #     list1[i] = stemmer.stem(list1[i])
    #
    # for i in range(0, len(list2)):
    #     list2[i] = wordnetLemmatizer.lemmatize(list2[i])
    #     list2[i] = stemmer.stem(list2[i])

    set_1 = set(list1)
    set_2 = set(list2)
    similarity = len(set_1.intersection(set_2)) / float(len(set_1.union(set_2)))

    return 1.0 - similarity


wordToSet = {}


def semantic(allsyns1, allsyns2):
    global wordToSet
    sum = 0.0
    count = 0.0

    # print(allsyns2)
    # for s1 in allsyns1:
    #     for s2 in allsyns2:
    #         score = s1.wup_similarity(s2)
    #         if score is None:
    #             score = 0
    #         sum = sum + score
    #         count += 1
    #
    # if count == 0:
    #     count = 1
    #


    # number of common elements between two arrays
    # sum = len(list(set(allsyns1) & set(allsyns2))) + 0.0
    # count = len(list(set(allsyns1))) + len(list(set(allsyns2))) - sum + 0.0
    # if count == 0.0:
    #     count = 1.0
    #
    # similarity = sum / count
    #

    for s1 in allsyns1:
        if s1 not in wordToSet:
            wordToSet[s1] = [sset.name() for sset in wordnet.synsets(s1)]

    for s2 in allsyns2:
        if s2 not in wordToSet:
            wordToSet[s2] = [sset.name() for sset in wordnet.synsets(s2)]

    for s1 in allsyns1:
        for s2 in allsyns2:
            if s1 == s2:
                sum += 1.0
            else:
                syncset1 = wordToSet[s1]
                syncset2 = wordToSet[s2]
                if len(syncset1) > 0 and len(syncset2) > 0:
                    # score = syncset1[0].wup_similarity(syncset2[0])
                    score = 1.0 if len(list(set(syncset1) & set(syncset2))) > 0 else 0.0
                    if score is not None and score is not 0.0:
                        sum += score

    count = len(list(set(allsyns1))) + len(list(set(allsyns2))) + 0.0

    return count - 2 * sum

    # if count == 0.0:
    #    count = 1.0

    # similarity = 2 * sum / count

    # print str(sum) + " " + str(count) + " " + str(similarity)

    # return (1.0 - similarity) * count

    # if len(allsyns1) > 0 and len(allsyns2) > 0:
    #     score = allsyns1[0].wup_similarity(allsyns2[0])
    #     if score is None:
    #         score = 0
    #     return 1 - score
    #
    # return 1


def layoutGenerationProgressive(data, client):
    global layoutCache
    global contentCache

    chunkSize = data["chunkSize"]
    size = data["content"] + 1

    # chunkSize, textsCopy, current = slicetexts(data)
    # if size == 1:
    #     distance[0][0] = 0
    # else:
    #     distance.resize(size, size)
    #
    #     for i, ctext in enumerate(textsCopy):
    #         #distance[size - 1][i] = semantic(ctext["syncset"], current["syncset"])
    #         distance[size - 1][i] = jaccard(ctext["keywords"], current["keywords"])
    #         distance[i][size - 1] = distance[size - 1][i]
    #
    #     distance[size - 1][size - 1] = 0

    layoutPacketCounter = size

    print "total lines is ----------------------------------------------------------- " + str(
        layoutPacketCounter) + " -- " + str(totalLines)

    if (layoutPacketCounter % chunkSize == 0 and layoutPacketCounter >= chunkSize) \
            or layoutPacketCounter == totalLines - 1:

        # tfidf = TfidfVectorizer().fit_transform(textsCopy)
        # similarities = linear_kernel(tfidf, tfidf)

        # number of iterations based on input from the client
        # model = MDS(n_components=2, n_init=1, max_iter=100, verbose=2, dissimilarity="precomputed")

        distance = np.copy(distancetexts[0:layoutPacketCounter, 0:layoutPacketCounter])

        approximate = "pca"
        ## if not the first time
        if layoutPacketCounter > chunkSize:
            approximate = np.zeros([layoutPacketCounter, 2])
            for i in range(0, layoutPacketCounter):
                if "location" in contentCache[i].keys():
                    approximate[i][0] = contentCache[i]["location"][0]
                    approximate[i][1] = contentCache[i]["location"][1]
                else:
                    # minDistanceIndex = 0
                    # minDistance = 100000
                    # for j in range(0, i):
                    #     if distance[i][j] < minDistance and "location" in contentCache[j].keys():
                    #         minDistanceIndex = j
                    #         minDistance = distance[i][j]
                    # approximate[i][0] = contentCache[minDistanceIndex]["location"][0]
                    # approximate[i][1] = contentCache[minDistanceIndex]["location"][1]
                    approximate[i][0] = random.random()
                    approximate[i][1] = random.random()

        model = TSNE(n_components=2, init=approximate, random_state=1, method='barnes_hut', n_iter=200, verbose=2)
        spatialData = model.fit_transform(distance)
        spatialLayout = spatialData.tolist()

        while pauseInterface:
            logger.info("system paused")

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
            contentCache[i]["location"] = l

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
            "relative": model.rel_measure
        }

        client.send_message('spatial content', returnData)


## Progressive topic modeling
def topicModellingProgressive(data, client):
    global layoutStop

    text = data["content"]
    chunkSize = data["chunkSize"]
    cache = []
    counter = 0
    colnames = ""
    chunkCounter = 0

    cache.append(text)
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
    global pauseInterface

    logger.info("event " + str(event))
    if event == "request file":
        future = thread_pool.submit(readFileProgressive, message, client)

    if event == "request layout":
        future = thread_pool.submit(layoutGenerationProgressive, message, client)

    if event == "request texts":
        ids = message["content"]
        returntexts = []

        for cell in ids:
            for points in layoutCache[cell["row"]][cell["col"]]["points"]:
                returntexts.append(contentCache[points["id"]])

        message = {}
        message["id"] = 1
        message["content"] = returntexts
        message["absolute-progress"] = {
            "current": 100,
            "total": 100,
            "relative": len(returntexts)
        }
        client.send_message("texts content", message)

    if event == "request keywords":
        ids = message["content"]
        returnKeywords = []

        for cell in ids:
            for point in layoutCache[cell["row"]][cell["col"]]["points"]:
                for keyword in contentCache[point["id"]]["keywords"]:
                    returnKeywords.append({"keyword": keyword, "sentiment": contentCache[point["id"]]["sentiment"]})

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

    if event == "pause interface":
        if pauseInterface:
            pauseInterface = False
        else:
            pauseInterface = True


class SocketHandler(tornado.websocket.WebSocketHandler):

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
