import random
import time
from tornado import gen
from tornado.concurrent import run_on_executor, futures
from tornado.ioloop import IOLoop
import nltk
import time

class TaskRunner(object):
    def __init__(self, loop=None):
        self.executor = futures.ThreadPoolExecutor(4)
        self.loop = loop or IOLoop.instance()

    @run_on_executor
    def long_running_task(self):
        tau = random.randint(0, 3)
        print nltk.word_tokenize("Mark Halpern papers open! For fans of #IBM or early programming languages. http://tinyurl.com/ht67c9d . #catHC #CLIR")
        time.sleep(1)
        return tau

loop = IOLoop() # this is necessary if running as an ipynb!
tasks = TaskRunner(loop)

@gen.coroutine
def do_stuff():
    result = yield tasks.long_running_task()
    raise gen.Return(result)

def do_other_stuff():
    print("blah")

def do_stupid_stuff():
    tau = random.randint(0, 3)
    print nltk.word_tokenize("Mark Halpern papers open! For fans of #IBM or early programming languages. http://tinyurl.com/ht67c9d . #catHC #CLIR")
    time.sleep(1)
    print tau

@gen.coroutine
def main():
    start_time = time.time()
    for i in range(10):
        #stuff = yield do_stuff()
        #print(stuff)
        do_stupid_stuff()
        do_other_stuff()
    print("--- %s seconds ---" % (time.time() - start_time))

loop.run_sync(main)