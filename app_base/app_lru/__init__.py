# coding:utf8
from lru import LRUCachedFunction, LRUCacheDict


def lru_cache_function(max_size=1024, expiration=15 * 60):
    """
    >>> @lru_cache_function(3, 1)
    ... def f(x):
    ...    print "Calling f(" + str(x) + ")"
    ...    return x
    >>> f(3)
    Calling f(3)
    3
    >>> f(3)
    3
    """

    def wrapper(func):
        return LRUCachedFunction(func, LRUCacheDict(max_size, expiration))

    return wrapper

