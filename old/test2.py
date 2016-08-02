import time, random
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from tornado.ioloop import IOLoop
from tornado import gen
import nltk

start_time = time.time()

def f(a, b, c, blah=None):
    print "got %s %s %s and %s" % (a, b, c, blah)
    print nltk.word_tokenize("Mark Halpern papers open! For fans of #IBM or early programming languages. http://tinyurl.com/ht67c9d . #catHC #CLIR")
    i = 0
    while i < 1000000000:
        i = i + 1

    print("--- %s seconds ---" % (time.time() - start_time))
    #return "hey there"

@gen.coroutine
def test_it():

    pool = ThreadPoolExecutor(max_workers=2)
    #for i in range(10):
    fut = pool.submit(f, random.randint(0, 3), random.randint(0, 3), random.randint(0, 3), blah="ok")  # This returns a concurrent.futures.Future
    print("running it asynchronously 1")

    fut2 = pool.submit(f, random.randint(0, 3), random.randint(0, 3), random.randint(0, 3), blah="ok")  # This returns a concurrent.futures.Future
    print("running it asynchronously 2")

    #ret = yield fut
    #print("it returned %s" % ret)

    #ret2 = yield fut2
    #print("it returned %s" % ret2)

    pool.shutdown()

IOLoop.instance().run_sync(test_it)