# coding:utf-8
from lru import LRUCacheDict
import time
from threading import RLock
from collections import OrderedDict

if __name__ == '__main__':
    d = LRUCacheDict(expiration=1)
    d['a'] = 'aaa'
    d['b'] = 'bbb'
    d['c'] = 'ccc'
    time.sleep(3)
    print d.get('a')
    print d.has_key('a')
