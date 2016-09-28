from tornado import gen
import time
import numpy as np

## Base class with 4 objects as read text, find sentiment, compute popularity, and compute layout
## readFileProgressive controls all four, update method in this class with the cacheContent
## readFileProgressive doesn't even need to run on a seperate thread
## possible to pause or stop just one of them --- class has variable pause

class Computation:
    pauseInterface = False
    revertInterface = False
    stopInterface = False
    forwardInterface = False
    playHeadChanged = False
    playHead = 1
    allkeywords = []
    prevNewKeywords = 0
    prevScore = 0

    speed = 0.2 #20 tweets read per sec
    chunkSize = 5

    chunkBytes = 0
    counter = 0
    cache = []
    message = {}

    absProgress = 0
    absProgressLimit = 0
    absTimeLeft = 0
    relProgress = 0

    absFunction = None
    relFunction = None

    sentimentAggregates = {}
    authorAggregates = {}

    def __init__(self, name):
        self.name = name

    def start_collection(self):
        self.chunkBytes = 0
        self.counter = 0
        self.cache = []
        self.message = {}

    def create_chunk_histories (self, totalLines):
        self.chunkHistories = []
        self.progressHistories = []

    def pause(self):
        print "\n Paused "+ self.name + "\n"
        self.pauseInterface = False if self.pauseInterface else True

    def stop(self):
        self.stopInterface = False if self.stopInterface else True

    def revert(self):
        self.revertInterface = False if self.revertInterface else True

    def forward(self):
        self.forwardInterface = False if self.forwardInterface else True

    def set_chunksize(self, chunkSize):
        self.chunkSize = chunkSize

    def set_absolute(self, abs):
        self.absFunction = abs

    def set_relative(self, rel):
        self.relFunction = rel

    def set_playhead(self, playHead):
        self.oldPlayHead = self.playHead
        self.playHead = playHead

    def reset_playhead(self):
        self.playHead = self.oldPlayHead

    def set_progress(self, absProgress=None, absProgressLimit=None,  absTimeLeft=None):
        if absProgress is not None:
            self.playHead = absProgress
        self.absProgress = self.playHead

        if absProgressLimit is not None:
            self.absProgressLimit = absProgressLimit

        if absTimeLeft is not None:
            self.absTimeLeft = absTimeLeft

        self.relProgress = self.chunkBytes

    def collect_data_when_paused(self, content):
        self.cache.append(content)
        print ("Collecting data when paused \n")

    def flush(self, client, handler=None):
        if len(self.cache) == 0:
            return

        self.message["id"] = self.cache[len(self.cache) - 1]["id"] + 1
        self.message["content"] = self.cache
        self.message["absolute-progress"] = self.absFunction(self.message)
        self.message["absolute-progress"]["relative"] = self.relFunction(self.message)
        if handler is not None:
            print "handler is not none"
            self.message["processed"] = handler(self.cache)

        client.send_message(self.name + " content", self.message)
        self.start_collection()

    def send_data(self, content, client, handler=None):

        if len(self.cache) > 0:
            if self.cache[len(self.cache) - 1]["textId"] == content["textId"]:
                return

        self.cache.append(content)
        self.counter += 1
        self.chunkBytes += content["bytes"]

        if self.counter%self.chunkSize == 0 and self.counter>=self.chunkSize:
            self.message["id"] = self.cache[len(self.cache) - 1]["id"] + 1

            self.message["content"] = self.cache

            if handler is not None:
                print "handler is not none"
                self.message["processed"] = handler(self.cache)


            self.message["absolute-progress"] = self.absFunction(self.message)
            self.message["progress-histories"] = self.progressHistories

            if not self.playHeadChanged:
                self.message["absolute-progress"]["relative"] = self.relFunction(self.message)
                self.message["absolute-progress"]["time"] = self.absTimeLeft
                self.chunkHistories.append(self.message["processed"])
                self.progressHistories.append(self.message["absolute-progress"])
            else:
                self.message["pause"] = 1

            client.send_message(self.name + " content", self.message)
            self.start_collection()