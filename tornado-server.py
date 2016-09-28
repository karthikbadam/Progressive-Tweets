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
import copy
import pickle

import math
import os.path
import os, sys
import json
import logging
import time
import re
import operator
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
totalSize = 1
filename = ""
# Columns in the text dataset -- republican dataset
# sentimentCol = "sentiment"
# authorNameCol = "name"
# textContentCol = "text"

# # Columns in the text dataset -- general dataset
# sentimentCol = "rating.1"
# authorNameCol = "author.name"
# textContentCol = "content"
# timeCol = "pub.date.GMT"

sentimentCol = "sentiment"
authorNameCol = "screen_name"
textContentCol = "text"
timeCol = "datetime"

## Global variables for layout computation
bin2DRows = 80
bin2DCols = 40
distanceTexts = np.zeros([1, 1])

## Global variables for NLTK stuff
stopset = stopwords.words('english')
freq_words = ['http', 'https', 'amp', 'com', 'co', 'th', 'tweetdebate', 'debate', 'mccain', 'obama', 'gopdebate',
              'gopdebates', 'rt', '__', 'gopdebate_', 'debate', 'debates', "current", "question", "debate08", "gop",
              "#Hillary2016", "hillary2016", "hillary", "trump2016", "donald", "make", "america", "great", "again", "thanks",
              "makeamericagreatagain", "president", "get", "put", "em", "us", "go", "cc", "de", "demdebate", "mr", "via", "2016",
              "say", "see", "many", "let", "new", "00", "16th", "im", "today", "trump", "need", "would", "said", "tedcruz",
              "realdonaldtrump", "live", "thank", "watch", "like", "ted", "people", "tonight", "today", "cruzcrew", "choosecruz",
              "country", "answer", "answering", "cruzcountry", "cruzvictory", "campaign", "right", "first", "going", "american", "think",
              "every", "following", "idpjj"]

user_stop_list = ["realdonaldtrump", "HillaryClinton", "hillaryclinton", "realDonaldTrump", "BernieSanders", "TedCruz", "tedcruz"]

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


def lineProgress(chunk):
    chunk = chunk["content"]
    progress = {}
    progress["current"] = chunk[len(chunk) - 1]["id"] + 1
    progress["total"] = totalLines
    return progress


def bytesProgress(chunk):
    chunk = chunk["content"]
    progress = {}
    bytes = 0
    for content in chunk:
        bytes += content["bytes"]

    progress["current"] = bytes
    progress["total"] = totalSize
    return progress


def speed(chunk):
    chunk = chunk["content"]
    bytes = 0
    for content in chunk:
        bytes += content["bytes"]

    return bytes/len(chunk)


def informationContent(chunk):
    if "processed" not in chunk:
        return 0

    keywords = chunk["processed"]
    keys = keywords.keys()
    max = 0
    min = 100
    newKeywords = 0
    allkeywords = fileReading.allkeywords
    for key in keys:
        if key not in allkeywords:
            newKeywords+=1
            fileReading.allkeywords.append(key)

    fileReading.prevScore += abs(newKeywords)/(len(allkeywords) + 0.0)
    score = fileReading.prevScore
    return score

    # value = keywords[key]
    # if value > max:
    #     max = value
    # if value < min:
    #     min = value
    #return 1 - (max - min)


fileReadingSwitcherAbs = {
    "lines": lineProgress,
    "bytes": bytesProgress
}

fileReadingSwitcherRel = {
    "speed": speed,
    "information": informationContent
}


def confidence(chunk):
    chunk = chunk["content"]
    score = 0

    currentSentiments = {}
    for t in chunk:
        if t["sentiment"] in currentSentiments:
            currentSentiments[t["sentiment"]] += 1
        else:
            currentSentiments[t["sentiment"]] = 1

    if len(sentimentAnalysis.chunkHistories) == 0:
        return 0

    prevSentiments = copy.copy(sentimentAnalysis.chunkHistories[len(sentimentAnalysis.chunkHistories) - 1])

    distance = 0
    for key in currentSentiments.keys():
        currentSentiments[key] = 1.0 * currentSentiments[key]/(len(chunk) * 1.0)
        prevSentiments[key] = 1.0 * prevSentiments[key]/(sentimentAnalysis.progressHistories[len(sentimentAnalysis.chunkHistories) - 1]["current"] * 1.0)
        distance +=  abs(currentSentiments[key] - prevSentiments[key])

    sentimentAnalysis.prevScore += distance/(len(contentCache)+1.0)
    return sentimentAnalysis.prevScore

    # for content in chunk:
    #     s = content["rawsentiment"]
    #     score += abs(abs(s) - 0.33)
    # score = score / len(chunk)
    # print "confidence " + str(score)
    # return score


def userdiversity(chunk):
    chunk = chunk["content"]
    authors = []
    popularObject = dict(
        sorted(userPopularity.authorAggregates.iteritems(), key=operator.itemgetter(1), reverse=True))
    popularUsers = popularObject.keys()

    for content in chunk:
        a = content["author"]
        if a in popularUsers:
            authors.append(a)

        # others = re.findall(r'@(\w+)', content["content"])
        # for o in others:
        #     if o in popularUsers and o not in authors:
        #         authors.append(o)

    userPopularity.prevScore += len(authors)/(len(popularUsers)+1.0)
    #score = (len(authors) + .0)
    return userPopularity.prevScore


sentimentSwitcherAbs = {
    "lines": lineProgress,
    "bytes": bytesProgress
}

sentimentSwitcherRel = {
    "speed": speed,
    "confidence": confidence
}

userSwitcherAbs = {
    "lines": lineProgress,
    "bytes": bytesProgress
}

userSwitcherRel = {
    "speed": speed,
    "diversity": userdiversity
}


def tfidfText(textContent):
    texts = []
    for t in textContent:
        currentText = re.sub(r'@(\w+)', "", t["content"])
        texts.append(currentText)

    if len(textContent) == 0:
        return {}

    tfidf = TfidfVectorizer(max_features=len(textContent) * 3,
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


def sentimentCollector(textContent):
    returnData = sentimentAnalysis.sentimentAggregates

    if sentimentAnalysis.playHeadChanged:
        for i, progress in enumerate(sentimentAnalysis.progressHistories):
            if sentimentAnalysis.playHead == progress["current"]:
                return sentimentAnalysis.chunkHistories[i]

    for t in textContent:
        if t["sentiment"] in returnData:
            returnData[t["sentiment"]] += 1
        else:
            returnData[t["sentiment"]] = 1

    return copy.copy(returnData)


def userCollector(textContent):
    returnData = userPopularity.authorAggregates

    if userPopularity.playHeadChanged:
        for i, progress in enumerate(userPopularity.progressHistories):
            if userPopularity.playHead == progress["current"]:
                return userPopularity.chunkHistories[i]

    for t in textContent:
        if t["author"] in returnData and t["author"] not in user_stop_list:
            returnData[t["author"]] += 1
        else:
            returnData[t["author"]] = 1

        otherUsers = re.findall(r'@(\w+)', t["content"])
        for user in otherUsers:
            #if user not in user_stop_list:
            if user in returnData:
                returnData[user] += 1
            else:
                returnData[user] = 1

    return copy.copy(returnData)


handlers = {
    "file": tfidfText,
    "sentiment": sentimentCollector,
    "user": userCollector
}


## Alternatively there are seperate functions for all four methods and they are called seperately?
@gen.coroutine
def handlePlayHead(data, client):
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

    changedComputation.flush(client, handler=handlers[target])
    changedComputation.playHeadChanged = True
    for content in contentCache[
                   changedComputation.playHead - 1: changedComputation.playHead + changedComputation.chunkSize - 1]:
        changedComputation.send_data(content, client, handler=handlers[target])

    changedComputation.reset_playhead()
    changedComputation.playHeadChanged = False

@gen.coroutine
def readTextData(data, client):
    index = data["content"]

    if fileReading.pauseInterface:
        logger.info(sentimentAnalysis.name + " paused")
        fileReading.collect_data_when_paused(contentCache[index])
    else:
        fileReading.set_chunksize(data["chunkSize"])
        fileReading.set_absolute(fileReadingSwitcherAbs[data["abs"]])
        fileReading.set_relative(fileReadingSwitcherRel[data["rel"]])
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
        sentimentAnalysis.set_absolute(sentimentSwitcherAbs[data["abs"]])
        sentimentAnalysis.set_relative(sentimentSwitcherRel[data["rel"]])
        sentimentAnalysis.set_progress(absProgress=index + 1, absProgressLimit=totalLines, absTimeLeft=5)
        sentimentAnalysis.send_data(contentCache[index], client, handler=sentimentCollector)

@gen.coroutine
def readUserData(data, client):
    index = data["content"]

    if userPopularity.pauseInterface:
        logger.info(userPopularity.name + " paused")
        userPopularity.collect_data_when_paused(contentCache[index])
    else:
        userPopularity.set_chunksize(data["chunkSize"])
        userPopularity.set_absolute(userSwitcherAbs[data["abs"]])
        userPopularity.set_relative(userSwitcherRel[data["rel"]])
        userPopularity.set_progress(absProgress=index + 1, absProgressLimit=totalLines, absTimeLeft=5)
        userPopularity.send_data(contentCache[index], client, handler=userCollector)


## Currently for csv files or tsv files
@gen.coroutine
def readFileProgressive(data, client):
    global totalLines
    global totalSize
    global filename

    filename = data["content"]
    colnames = ""

    totalSize = os.path.getsize("public/data/" + filename)
    bytesRead = 0.0
    linesRead = 0
    lineNumber = 0

    fileReading.start_collection()
    sentimentAnalysis.start_collection()
    userPopularity.start_collection()
    layoutComputation.start_collection()

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

                if lineNumber == 1:
                    fileReading.create_chunk_histories(totalLines)
                    sentimentAnalysis.create_chunk_histories(totalLines)
                    userPopularity.create_chunk_histories(totalLines)
                    layoutComputation.create_chunk_histories(totalLines)

                textDatum = {}
                values = line.strip().split("\t")
                for i, value in enumerate(values):
                    if i < len(colnames):
                        textDatum[colnames[i]] = unicode(value, errors='ignore')

                textDatumOut = {}
                textDatumOut["id"] = lineNumber - 1
                textSentimentVader = vaderSentiment(textDatum[textContentCol])
                textDatumOut["rawsentiment"] = textSentimentVader["compound"]
                textDatumOut["sentiment"] = "Positive" if textSentimentVader["compound"] > 0.33 else "Negative" if \
                    textSentimentVader["compound"] < -0.33 else "Neutral"
                textDatumOut["content"] = re.sub(r'https?:\/\/.*[\r\n]*', "", re.sub(r'\<U\+(\w+)\>', "", textDatum[textContentCol]))
                textDatumOut["author"] = textDatum[authorNameCol]
                textDatumOut["textId"] = lineNumber - 1
                textDatumOut["keywords"] = tokenizetexts({"content": textDatumOut["content"]})
                textDatumOut["bytes"] = len(line)
                textDatumOut["time"] = textDatum[timeCol]

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
                time.sleep(0.004)
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

    layoutComputation.set_chunksize(data["chunkSize"])
    layoutPacketCounter = data["content"] + 1
    perplexity = data["perplexity"]
    layoutComputation.perplexity = perplexity
    iterations = data["iterations"]
    layoutComputation.iterations = iterations

    print "total lines is ----------------------------------------------------------- " + str(
        layoutPacketCounter) + " -- " + str(totalLines)

    if (layoutPacketCounter % layoutComputation.chunkSize == 0 and layoutPacketCounter >= layoutComputation.chunkSize) \
            or layoutPacketCounter == totalLines - 1:


        # tfidf = TfidfVectorizer().fit_transform(textsCopy)
        # similarities = linear_kernel(tfidf, tfidf)

        distance = np.copy(distanceTexts[0:layoutPacketCounter, 0:layoutPacketCounter])

        approximate = "pca"

        ## if not the first time
        if layoutPacketCounter > layoutComputation.chunkSize:
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
        model = None
        spatialLayout = None
        kl_divergence_ = 0
        print(filename.split("."))
        directory = "public/data/cache"
        f = filename.split(".")[0]
        if os.path.isfile(directory+ "/"+f+str(layoutPacketCounter)+".pkl"):
            print(directory+ "/"+f+str(layoutPacketCounter)+".pkl")
            pkl_file =  open(directory+ "/"+f+str(layoutPacketCounter)+".pkl", 'rb')
            model = pickle.load(pkl_file)
            spatialLayout = model["layout"]
            kl_divergence_ = model["error"]
        else:
            model = TSNE(n_components=2, init=approximate, random_state=1, method='barnes_hut', n_iter=iterations,
                     verbose=2,
                     perplexity=perplexity)
            spatialData = model.fit_transform(distance)
            spatialLayout = spatialData.tolist()
            kl_divergence_ = model.kl_divergence_
            output = open(directory+ "/"+f+str(layoutPacketCounter)+".pkl", 'wb')
            fileDump = {}
            fileDump["layout"] = spatialLayout
            fileDump["error"] = model.kl_divergence_
            pickle.dump(fileDump, output)

        while pauseInterface:
            logger.info("system paused")

        # while layoutComputation.pauseInterface:
        #     logger.info("layout system paused")

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
        nClusters = data["clusters"]
        layoutComputation.clusters = nClusters
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
                "label": int("" + str(labels[index])),
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
                currentText = re.sub(r'@(\w+)', "", contentCache[p["id"]]["content"])
                clusterTexts[label].append(currentText)

        for i in range(0, nClusters):
            tfidf = TfidfVectorizer(max_features=100,
                                    min_df=1,
                                    stop_words=stopset)
            tfs = tfidf.fit_transform(clusterTexts[i])
            scores = zip(tfidf.get_feature_names(),
                         np.asarray(tfs.sum(axis=0)).ravel())
            sortedWordScores = sorted(scores, key=lambda x: x[1], reverse=True)
            for word in sortedWordScores:
                if len(word[0]) > 4:
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
            "relative": kl_divergence_
        }

        print("\n" + str(data) + "\n")

        layoutComputation.rel_measure = data["rel"]

        if data["rel"] == "quality":
            returnData["absolute-progress"]["relative"] = 5 - kl_divergence_
        elif data["rel"] == "tsneerror":
            returnData["absolute-progress"]["relative"] = kl_divergence_
        elif data["rel"] == "kmeanserror":
            returnData["absolute-progress"]["relative"] = kmeans.inertia_

        if "pause" in data:
            returnData["pause"] = 1
        else:
            layoutComputation.progressHistories.append(returnData["absolute-progress"])
            returnData["progress-histories"] = layoutComputation.progressHistories
        layoutComputation.chunkHistories.append(returnData)

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

    logger.info("event|||" + str(event) + "|||message|||" + str(message))
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
        message["keywords"] = tfidfText(returntexts)

        returnKeywords = []
        if len(returntexts) > 1:
            for t in returntexts:
                for keyword in message["keywords"].keys():
                    if keyword in t["keywords"]:
                        returnKeywords.append(
                            {"keyword": keyword, "value": message["keywords"][keyword], "sentiment": t["sentiment"]})

        else:
            for t in returntexts:
                for keyword in t["keywords"]:
                    returnKeywords.append(
                        {"keyword": keyword, "value": 1, "sentiment": t["sentiment"]})

        message["keywordsSentiment"] = returnKeywords

        message["users"] = {}
        message["sentiments"] = {}

        for t in returntexts:

            if t["sentiment"] in message["sentiments"]:
                message["sentiments"][t["sentiment"]] += 1
            else:
                message["sentiments"][t["sentiment"]] = 1

            if t["author"] in message["users"] and t["author"] not in user_stop_list:
                message["users"][t["author"]] += 1
            else:
                message["users"][t["author"]] = 1

            otherUsers = re.findall(r'@(\w+)', t["content"])
            for user in otherUsers:
                #if user not in user_stop_list:
                if user in message["users"]:
                    message["users"][user] += 1
                else:
                    message["users"][user] = 1

        message["absolute-progress"] = {
            "current": 100,
            "total": 100,
            "relative": len(returntexts)
        }
        client.send_message("texts content", message)

    if event == "request keywords":
        ids = message["content"]

        returnKeywords = []
        if len(ids) > 1:
            texts = []
            meta = []

            for cell in ids:
                for point in layoutCache[cell["row"]][cell["col"]]["points"]:
                    texts.append(contentCache[point["id"]]["content"])
                    meta.append({"id": point["id"], "sentiment": contentCache[point["id"]]["sentiment"]})
                    # for keyword in contentCache[point["id"]]["keywords"]:
                    #     returnKeywords.append({"keyword": keyword, "sentiment": contentCache[point["id"]]["sentiment"]})

            tfidf = TfidfVectorizer(max_features=100,
                                    min_df=1,
                                    stop_words=stopset)
            tfs = tfidf.fit_transform(texts)
            scores = zip(tfidf.get_feature_names(),
                         np.asarray(tfs.sum(axis=0)).ravel())
            sortedWordScores = sorted(scores, key=lambda x: x[1], reverse=True)

            for word in sortedWordScores:
                for m in meta:
                    if word[0] in re.sub("[^a-zA-Z]", " ", contentCache[m["id"]]["content"]).lower():
                        returnKeywords.append(
                            {"keyword": word[0], "value": word[1], "sentiment": m["sentiment"]})

        else:
            for cell in ids:
                for point in layoutCache[cell["row"]][cell["col"]]["points"]:
                    for keyword in contentCache[point["id"]]["keywords"]:
                        returnKeywords.append(
                            {"keyword": keyword, "value": 1, "sentiment": contentCache[point["id"]]["sentiment"]})

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
            #layoutComputation.set_playhead(message["content"]["value"])
            data = {}
            data["chunkSize"] = layoutComputation.chunkSize
            data["content"] = message["content"]["value"] - 1
            data["perplexity"] = layoutComputation.perplexity
            data["iterations"] = layoutComputation.iterations
            data["clusters"] = layoutComputation.clusters
            data["rel"] = layoutComputation.rel_measure
            data["pause"] = True
            future = thread_pool.submit(layoutGenerationProgressive, data, client)
            #layoutComputation.pause()
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
