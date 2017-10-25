# coding: utf8

from redis.lock import Lock
from app_base.utils.data_encoder import JSONDataEncoder
from app_base.app_redis.redis_pool import RedisPool

DEBUG_CACHE = False


def _dist_lock_key(name):
    return ':'.join([name, 'lock'])


def _set_expire_time(redis_cli, name, ex):
    if ex and isinstance(ex, int):
        redis_cli.expire(name, ex)


def set_cache(key, value, ex=None):
    """
    key           : redis 键名
    value         : redis 键值
    ex            : 超期时间 (单位：秒)
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(key), timeout=20):
        if DEBUG_CACHE:
            print "set redis cache. %s %s" % (key, ex)
        try:
            v = JSONDataEncoder.encode(value)
        except:
            v = value
        cli.set(key, v, ex)
    return True


def get_cache(key, ex=None, none_callback=None, *args, **kwargs):
    """
    key           : redis 键名
    ex            : 超期时间 (单位：秒)
    none_callback : 返回None值，调用回调函数
    args          : 回调参数
    kwags         : 回调参数
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(key), timeout=20):
        v = cli.get(key)
        if v is None and none_callback:
            if DEBUG_CACHE:
                print "no redis cache hit. %s." % key
            v = none_callback(*args, **kwargs)
            try:
                nv = JSONDataEncoder.encode(v)
            except:
                nv = v
            cli.set(key, nv, ex)
        else:
            if DEBUG_CACHE:
                print "cache redis hit. %s." % key
            try:
                v = JSONDataEncoder.decode(v)
            except:
                pass
    return v


def set_hash_cache(name, key, value, ex=None):
    """
    name          : redis hash name
    key           : redis 键名
    value         : redis 键值
    ex            : 超期时间 (单位：秒)
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(name), timeout=20):
        if DEBUG_CACHE:
            print "set redis hash cache. %s %s" % (key, ex)
        try:
            v = JSONDataEncoder.encode(value)
        except:
            v = value
        cli.hset(name, key, v)
        _set_expire_time(cli, name, ex)
    return True


def get_hash_cache(name, key, ex=None, none_callback=None, *args, **kwargs):
    """
    name          : redis hash name
    key           : redis 键名
    ex            : 超期时间 (单位：秒)
    none_callback : 返回None值，调用回调函数
    args          : 回调参数
    kwags         : 回调参数
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(name), timeout=20):
        v = cli.hget(name, key)
        if v is None and none_callback:
            if DEBUG_CACHE:
                print "no redis cache hit. %s." % key
            v = none_callback(*args, **kwargs)
            try:
                nv = JSONDataEncoder.encode(v)
            except:
                nv = v
            cli.hset(name, key, nv)
            _set_expire_time(cli, name, ex)
        else:
            if DEBUG_CACHE:
                print "cache redis hit. %s." % key
            try:
                v = JSONDataEncoder.decode(v)
            except:
                pass
    return v


def set_hash_map_cache(name, mapping, ex=None):
    """
    name          : name
    mapping       : mapping dict
    ex            : 超期时间 (单位：秒)
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(name), timeout=20):
        if DEBUG_CACHE:
            print "set redis hash map. %s %s" % (name, ex)
        cli.hmset(name, mapping)
        _set_expire_time(cli, name, ex)
    return True


def get_hash_map_cache(name, keys, ex=None, none_callback=None, *args, **kwargs):
    """
    name          : name
    keys          : key list
    ex            : 超期时间 (单位：秒)
    none_callback : 返回None值，调用回调函数
    args          : 回调参数
    kwags         : 回调参数
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(name), timeout=20):
        v = cli.hmget(name, keys)
        if v is None and none_callback:
            if DEBUG_CACHE:
                print "no redis cache hit. %s." % keys
            v = none_callback(*args, **kwargs)
            cli.hmset(name, v)
            _set_expire_time(cli, name, ex)

        if v and (isinstance(keys, str) or (isinstance(keys, list) and len(keys) == 1)):
            v = v[-1]
    return v


def refresh_redis_cache(name, ex):
    """
        name          : name
        ex            : 超期时间 (单位：秒)
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(name), timeout=20):
        _set_expire_time(cli, name, ex)


def del_map_hash_cache(name):
    """
    name          : name
    """
    cli = RedisPool().connection()
    with Lock(cli, _dist_lock_key(name), timeout=20):
        keys = cli.hkeys(name)
        count = cli.hdel(name,*keys)
        if count:
            return True
    return False


if __name__ == '__main__':
    from time import sleep

    print set_hash_cache('hash_name', 'hash_key', 'hash_value', 10)
    for _i in xrange(10):
        sleep(1)
        print get_hash_cache('hash_name', 'hash_key')
        print 'seconds:', _i+1
    print get_hash_cache('hash_name', 'hash_key')

    _test_hash_mapping = dict(a=1, b=2, c=3, d=4)
    print set_hash_map_cache('hash_map_name', _test_hash_mapping, 5)
    for _i in xrange(5):
        sleep(1)
        print get_hash_map_cache('hash_map_name', ['a', 'c'])
        print 'seconds:', _i+1
    print get_hash_map_cache('hash_map_name', 'd')
    # _test_hash_mapping = dict(name=1, b=2, c=3, d=4)
    # print set_hash_map_cache('u:22', _test_hash_mapping, 5)
    # print del_map_hash_cache('u:22')
    # print get_hash_map_cache('hash_map_name')
