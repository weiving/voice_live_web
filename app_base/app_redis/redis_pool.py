# coding:utf8

import redis

from app_base.utils.singleton import Singleton
try:
    from settings import REDIS_CONFIG
except:
    REDIS_CONFIG = {}


class RedisPool(object):
    __metaclass__ = Singleton

    def __init__(self):
        super(RedisPool, self).__init__()

        self.pool = None
        self.init_pool()

    def init_pool(self):
        self.pool = redis.ConnectionPool(
            host=REDIS_CONFIG.get('host', '127.0.0.1'),
            port=REDIS_CONFIG.get("port", 6379),
            db=REDIS_CONFIG.get('db', 0),
            password=REDIS_CONFIG.get('password'))

    def connection(self):
        return redis.Redis(connection_pool=self.pool)
