from tornado import gen
import time

## Create base class with 4 objects as read text, find sentiment, compute popularity, and compute layout
## readFileProgressive controls all four, it methods in those classes with the cacheContent and makes them send the data?
## readFileProgressive doesn't even need to run on a seperate thread
## possible to pause or stop just one of them --- class has variable pause
class Computation:
    pauseInterface = False
    revertInterface = False
    stopInterface = False
    forwardInterface = False
    playHeadChanged = False
    playHead = 1

    speed = 10 #10 updates per sec
    chunkSize = 5

    chunkBytes = 0
    counter = 0
    chunkCounter = 0
    cache = []
    message = {}

    absProgress = 0
    absProgressLimit = 0
    absTimeLeft = 0
    relProgress = 0

    def __init__(self, name):
        self.name = name

    def start_collection(self, flag=True):
        self.chunkBytes = 0
        self.counter = 0
        self.cache = []
        self.message = {}

        if flag:
            self.chunkCounter = 0

    def setPlayHead(self, playHead):
        self.playHead = playHead

    def setProgress(self, absProgress=None, absProgressLimit=None,  absTimeLeft=None):
        if absProgress is not None:
            self.playHead = absProgress
        self.absProgress = self.playHead

        if absProgressLimit is not None:
            self.absProgressLimit = absProgressLimit

        if absTimeLeft is not None:
            self.absTimeLeft = absTimeLeft

        self.relProgress = self.chunkBytes

    @gen.coroutine
    def send_data(self, content, client):
        self.counter += 1
        self.cache.append(content)
        self.chunkBytes += content["bytes"]

        if self.counter % self.chunkSize == 0 and self.counter >= self.chunkSize:
            self.chunkCounter += 1

            self.message["id"] = self.chunkCounter
            self.message["content"] = self.cache
            self.message["absolute-progress"] = {
                "current": self.absProgress,
                "total": self.absProgressLimit
            }

            if not self.playHeadChanged:
                self.message["absolute-progress"]["relative"] = self.relProgress
                self.message["absolute-progress"]["time"] = self.absTimeLeft

            client.send_message(self.name + " content", self.message)
            self.start_collection(flag=False)
            #time.sleep(1000 / self.speed)

