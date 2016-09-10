import Settings
from Computation import Computation
import tornado.escape
import tornado.ioloop
import tornado.web as web
import tornado.websocket
from tornado import gen
import random
from tornado import iostream
import tornadis
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from tornado.ioloop import IOLoop

import math
import os.path
import os, sys
import json
import logging
import time
import re
import numpy as np

from sklearn.manifold import TSNE
from sklearn.manifold import MDS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from sklearn.cluster import KMeans

import nltk
from nltk import ngrams
from nltk.stem.porter import PorterStemmer
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet
import gensim
from gensim import corpora, models
from vaderSentiment.vaderSentiment import sentiment as vaderSentiment

## Logging all the messages
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)
logger = logging.getLogger(__name__)

## Global variables for controlling the progression
pauseInterface = False
revertInterface = False
stopInterface = False

fileReading = Computation("file")
sentimentAnalysis = Computation("sentiment")
userPopularity = Computation("user")
layoutComputation = Computation("layout")

## Global variables for managing the progression (file reading and storage)-- need to be replaced with a database
playHead = 1
contentCache = []
layoutCache = []
totalLines = 1
# Columns in the text dataset -- republican dataset
sentimentCol = "sentiment"
authorNameCol = "name"
textContentCol = "text"
# # Columns in the text dataset -- general dataset
# sentimentCol = "rating.1"
# authorNameCol = "author.name"
# textContentCol = "content"


## Global variables for layout computation
bin2DRows = 80
bin2DCols = 40
distanceTexts = np.zeros([1, 1])

## Global variables for NLTK stuff
stopset = stopwords.words('english')
freq_words = ['http', 'https', 'amp', 'com', 'co', 'th', 'textdebate', 'debate', 'mccain', 'obama', 'gopdebate',
              'gopdebates', 'rt', '__', 'gopdebate_']
for i in freq_words:
    stopset.append(i)

textCorpus = []

## Global variables for the code
thread_pool = ThreadPoolExecutor(200)
stemmer = PorterStemmer()
wordnetLemmatizer = WordNetLemmatizer()


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


## Alternatively there are seperate functions for all four methods and they are called seperately?
@gen.coroutine
def handlePlayHead(data, client):
    print "\n-------------------------------------------------------" + str(data["content"])
    target = data["content"]["target"]

    changedComputation = fileReading
    if fileReading.name == target:
        fileReading.set_playhead(data["content"]["value"])
        changedComputation = fileReading
    if sentimentAnalysis.name == target:
        sentimentAnalysis.set_playhead(data["content"]["value"])
        changedComputation = sentimentAnalysis
    if userPopularity.name == target:
        userPopularity.set_playhead(data["content"]["value"])
        changedComputation = userPopularity

    changedComputation.flush(client)
    changedComputation.playHeadChanged = True
    for content in contentCache[
                   changedComputation.playHead - 1: changedComputation.playHead + changedComputation.chunkSize - 1]:
        changedComputation.send_data(content, client)
        changedComputation.playHead += 1

    changedComputation.reset_playhead()
    changedComputation.playHeadChanged = False

    ## pause on the server if not paused already


def tfidfText (textContent):
    texts = []
    for t in textContent:
        texts.append(t["content"])
    tfidf = TfidfVectorizer(max_features=len(textContent)*2,
                            min_df=1,
                            stop_words=stopset)
    tfs = tfidf.fit_transform(texts)
    scores = zip(tfidf.get_feature_names(),
                 np.asarray(tfs.sum(axis=0)).ravel())
    sortedWordScores = sorted(scores, key=lambda x: x[1], reverse=True)
    returnData = {}
    for word in sortedWordScores:
        returnData[str(word[0])] = word[1]
    return returnData

@gen.coroutine
def readTextData(data, client):
    index = data["content"]
    if sentimentAnalysis.pauseInterface:
        logger.info(sentimentAnalysis.name + " paused")
        fileReading.collect_data_when_paused(contentCache[index])
    else:
        fileReading.set_chunksize(data["chunkSize"])
        fileReading.set_progress(absProgress=index + 1, absProgressLimit=totalLines, absTimeLeft=5)
        fileReading.send_data(contentCache[index], client, handler=tfidfText)


@gen.coroutine
def readSentimentData(data, client):
    index = data["content"]
    if sentimentAnalysis.pauseInterface:
        logger.info(sentimentAnalysis.name + " paused")
        sentimentAnalysis.collect_data_when_paused(contentCache[index])
    else:
        sentimentAnalysis.set_chunksize(data["chunkSize"])
        sentimentAnalysis.set_progress(absProgress=index + 1, absProgressLimit=totalLines, absTimeLeft=5)
        sentimentAnalysis.send_data(contentCache[index], client)


@gen.coroutine
def readUserData(data, client):
    index = data["content"]
    if userPopularity.pauseInterface:
        logger.info(userPopularity.name + " paused")
        userPopularity.collect_data_when_paused(contentCache[index])
    else:
        userPopularity.set_chunksize(data["chunkSize"])
        userPopularity.set_progress(absProgress=index + 1, absProgressLimit=totalLines, absTimeLeft=5)
        userPopularity.send_data(contentCache[index], client)


## Currently for csv files or tsv files
@gen.coroutine
def readFileProgressive(data, client):
    global totalLines

    filename = data["content"]
    colnames = ""

    totalSize = os.path.getsize("public/data/" + filename)
    bytesRead = 0.0
    linesRead = 0
    lineNumber = 0

    fileReading.start_collection()
    sentimentAnalysis.start_collection()
    userPopularity.start_collection()

    fileReading.set_chunksize(data["chunkSize"])

    with open("public/data/" + filename, 'r') as infile:
        for line in infile:
            if lineNumber == 0:
                colnames = line.strip().split("\t")
                totalSize = totalSize - sys.getsizeof(line)
                lineNumber = 1
            else:
                while pauseInterface:
                    logger.info("system paused")

                bytesRead = bytesRead + len(line)
                linesRead = lineNumber
                totalLines = int(round((linesRead / bytesRead) * totalSize))

                textDatum = {}
                values = line.strip().split("\t")
                for i, value in enumerate(values):
                    if i < len(colnames):
                        textDatum[colnames[i]] = unicode(value, errors='ignore')

                textDatumOut = {}
                textDatumOut["id"] = lineNumber - 1
                textSentimentVader = vaderSentiment(textDatum[textContentCol])
                textDatumOut["sentiment"] = "Positive" if textSentimentVader["compound"] > 0.33 else "Negative" if \
                    textSentimentVader["compound"] < -0.33 else "Neutral"
                textDatumOut["content"] = textDatum[textContentCol]
                textDatumOut["author"] = textDatum[authorNameCol]
                textDatumOut["textId"] = textDatum["id"]
                textDatumOut["keywords"] = tokenizetexts({"content": textDatum[textContentCol]})
                textDatumOut["bytes"] = len(line)

                if len(contentCache) < lineNumber:
                    contentCache.append(textDatumOut)

                # if (fileReading.pauseInterface):
                #     fileReading.collect_data_when_paused(textDatumOut)
                # else:
                #     fileReading.set_progress(absProgress=linesRead, absProgressLimit=totalLines, absTimeLeft=5)
                #     fileReading.send_data(textDatumOut, client)

                # compute distance between the tweets at the same time
                if lineNumber == 1:
                    distanceTexts[0][0] = 0
                else:
                    if lineNumber > distanceTexts.shape[0]:
                        distanceTexts.resize(totalLines, totalLines)
                    for i, ctext in enumerate(contentCache):
                        distanceTexts[lineNumber - 1][i] = semantic(ctext["keywords"], textDatumOut["keywords"])
                        distanceTexts[i][lineNumber - 1] = distanceTexts[lineNumber - 1][i]
                    distanceTexts[lineNumber - 1][lineNumber - 1] = 0

                client.send_message("bounce content", lineNumber - 1)
                time.sleep(fileReading.speed)
                lineNumber += 1

        totalLines = linesRead


def slicetexts(data):
    global contentCache
    index = data["content"]
    return data["chunkSize"], contentCache[:index], contentCache[index]


def tokenizetexts(data):
    return generateKeywords(data["content"])


wordToSet = {}


def semantic(allsyns1, allsyns2):
    global wordToSet
    sum = 0.0

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


def layoutGenerationProgressive(data, client):
    global layoutCache
    global contentCache

    chunkSize = data["chunkSize"]
    layoutPacketCounter = data["content"] + 1

    print "total lines is ----------------------------------------------------------- " + str(
        layoutPacketCounter) + " -- " + str(totalLines)

    if (layoutPacketCounter % chunkSize == 0 and layoutPacketCounter >= chunkSize) \
            or layoutPacketCounter == totalLines - 1:

        # tfidf = TfidfVectorizer().fit_transform(textsCopy)
        # similarities = linear_kernel(tfidf, tfidf)

        distance = np.copy(distanceTexts[0:layoutPacketCounter, 0:layoutPacketCounter])

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

        # number of iterations based on input from the client
        # model = MDS(n_components=2, n_init=1, max_iter=100, verbose=2, dissimilarity="precomputed")
        model = TSNE(n_components=2, init=approximate, random_state=1, method='barnes_hut', n_iter=200, verbose=2)
        spatialData = model.fit_transform(distance)
        spatialLayout = spatialData.tolist()

        while pauseInterface:
            logger.info("system paused")



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

        clusterPoints = []

        # flatten the layout matrix
        for i in range(0, bin2DRows):
            for j in range(0, bin2DCols):
                if matrix[i][j]["density"] != 0:
                    point = []
                    point.append(i)
                    point.append(j)
                    clusterPoints.append(point)

        ## Apply k-means
        print "Applying K-means"
        nClusters = 7
        kmeans = KMeans(n_clusters=nClusters, random_state=1, verbose=2)
        labels = kmeans.fit_predict(clusterPoints)
        clusterCenters = kmeans.cluster_centers_


        layouts = []
        for index, point in enumerate(clusterPoints):
            i = point[0]
            j = point[1]
            datum = {}
            datum["row"] = i
            datum["col"] = j
            datum["content"] = {
                "label": int(""+str(labels[index])),
                "density": matrix[i][j]["density"]
            }
            layouts.append(datum)


        clusters = []
        clusterTexts = []
        for i in range(0, nClusters):
            clusters.append({})
            clusters[i]["points"] = []
            clusters[i]["keywords"] = []
            clusterTexts.append([])


        for point in layouts:
            label = point["content"]["label"]
            datum = {}
            datum["row"] = point["row"]
            datum["col"] = point["col"]
            clusters[label]["points"].append(datum)
            for p in matrix[datum["row"]][datum["col"]]["points"]:
                clusterTexts[label].append(contentCache[p["id"]]["content"])


        for i in range(0, nClusters):
            tfidf = TfidfVectorizer(max_features=100,
                                    min_df=1,
                                    ngram_range=(1, 2),
                                    stop_words=stopset)
            tfs = tfidf.fit_transform(clusterTexts[i])
            scores = zip(tfidf.get_feature_names(),
                         np.asarray(tfs.sum(axis=0)).ravel())
            sortedWordScores = sorted(scores, key=lambda x: x[1], reverse=True)
            for word in sortedWordScores:
                clusters[i]["keywords"].append({
                    "word": str(word[0]),
                    "score": word[1]
                })
                clusters[i]["center"] = {
                    "row": round(clusterCenters[i][0]),
                    "col": round(clusterCenters[i][1])}


        returnData = {}
        returnData["content"] = {"layout": layouts, "clusters": clusters}
        layoutCache = matrix
        returnData["absolute-progress"] = {
            "current": layoutPacketCounter,
            "total": totalLines,
            "relative": model.rel_measure
        }

        client.send_message('spatial content', returnData)


## Progressive topic modeling
def topicModellingProgressive(data, client):
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
    global playHead
    global contentCache

    logger.info("event " + str(event))
    if event == "request file":
        future = thread_pool.submit(readFileProgressive, message, client)

    if event == "request text":
        future = thread_pool.submit(readTextData, message, client)

    if event == "request sentiment":
        future = thread_pool.submit(readSentimentData, message, client)

    if event == "request user":
        future = thread_pool.submit(readUserData, message, client)

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
        target = message
        print "\n Pause triggered " + sentimentAnalysis.name + " " + str(message) + "\n"
        if target == "all":
            pauseInterface = False if pauseInterface else True
        else:
            changedComputation = fileReading
            if fileReading.name == target:
                changedComputation = fileReading
            if sentimentAnalysis.name == target:
                changedComputation = sentimentAnalysis
            if userPopularity.name == target:
                changedComputation = userPopularity
            if layoutComputation.name == target:
                changedComputation = layoutComputation
            changedComputation.pause()

    if event == "change playhead":
        if layoutComputation.name == message["content"]["target"]:
            layoutComputation.set_playhead(message["content"]["value"])
            layoutComputation.pause()
        else:
            future = thread_pool.submit(handlePlayHead, message, client)


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
