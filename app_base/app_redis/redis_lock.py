# coding:utf-8
"""
参考： http://redis.io/topics/distlock
"""

import time
import uuid
from redis.lock import Lock
from redis.exceptions import LockError

from redis_pool import RedisPool


class LockTimeout(BaseException):
    """Raised in the event a timeout occurs while waiting for a lock"""


class RedisLock(Lock):
    """
    Redis分布式锁
    和官方库不同的是：用上下文管理方式使用锁允许阻塞模式和非阻塞模式。
    当使用非阻塞模式时，如果发现锁已经被抢占，则抛出LockTimeout异常，外层代码应该感知该异常

    使用:
    try:
        with GPRedisLock(conn, 'hello_world', timeout=15, blocking=False):
            # do something
            pass
    except LockTimeout e:
        pass
    except Exception e:
        pass
    """
    def __init__(self, *args, **kwargs):
        super(RedisLock, self).__init__(*args, **kwargs)

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        print 'exit'
        self.release()

    def acquire(self, blocking=None, blocking_timeout=None):
        sleep = self.sleep
        token = uuid.uuid1().hex
        if blocking is None:
            blocking = self.blocking
        if blocking_timeout is None:
            blocking_timeout = self.blocking_timeout
        stop_trying_at = None
        if blocking_timeout is not None:
            stop_trying_at = time.time() + blocking_timeout
        while 1:
            if self.do_acquire(token):
                self.local.token = token
                break
            if not blocking:
                raise LockTimeout("Timeout while waiting for lock")
            if stop_trying_at is not None and time.time() > stop_trying_at:
                raise LockTimeout("Timeout while waiting for lock")
            time.sleep(sleep)

    def do_acquire(self, token):
        if self.redis.setnx(self.name, token):
            if self.timeout:
                # convert to milliseconds
                timeout = int(self.timeout * 1000)
                self.redis.pexpire(self.name, timeout)
            return True
        return False

    def release(self):
        expected_token = self.local.token
        if expected_token is None:
            raise LockError("Cannot release an unlocked lock")
        self.local.token = None
        self.do_release(expected_token)

    def do_release(self, expected_token):
        name = self.name

        def execute_release(pipe):
            lock_value = pipe.get(name)
            if lock_value != expected_token:
                raise LockError("Cannot release a lock that's no longer owned")
            pipe.delete(name)

        self.redis.transaction(execute_release, name)


class RedisLuaLock(RedisLock):
    """
    内嵌Lua脚本的分布式锁，效率较高
    """
    lua_acquire = None
    lua_release = None
    lua_extend = None

    # KEYS[1] - lock name
    # ARGV[1] - token
    # ARGV[2] - timeout in milliseconds
    # return 1 if lock was acquired, otherwise 0
    LUA_ACQUIRE_SCRIPT = """
        if redis.call('setnx', KEYS[1], ARGV[1]) == 1 then
            if ARGV[2] ~= '' then
                redis.call('pexpire', KEYS[1], ARGV[2])
            end
            return 1
        end
        return 0
    """

    # KEYS[1] - lock name
    # ARGS[1] - token
    # return 1 if the lock was released, otherwise 0
    LUA_RELEASE_SCRIPT = """
        local token = redis.call('get', KEYS[1])
        if not token or token ~= ARGV[1] then
            return 0
        end
        redis.call('del', KEYS[1])
        return 1
    """

    # KEYS[1] - lock name
    # ARGS[1] - token
    # ARGS[2] - additional milliseconds
    # return 1 if the locks time was extended, otherwise 0
    LUA_EXTEND_SCRIPT = """
        local token = redis.call('get', KEYS[1])
        if not token or token ~= ARGV[1] then
            return 0
        end
        local expiration = redis.call('pttl', KEYS[1])
        if not expiration then
            expiration = 0
        end
        if expiration < 0 then
            return 0
        end
        redis.call('pexpire', KEYS[1], expiration + ARGV[2])
        return 1
    """

    def __init__(self, *args, **kwargs):
        super(RedisLuaLock, self).__init__(*args, **kwargs)
        RedisLuaLock.register_scripts(self.redis)

    @classmethod
    def register_scripts(cls, redis):
        if cls.lua_acquire is None:
            cls.lua_acquire = redis.register_script(cls.LUA_ACQUIRE_SCRIPT)
        if cls.lua_release is None:
            cls.lua_release = redis.register_script(cls.LUA_RELEASE_SCRIPT)
        if cls.lua_extend is None:
            cls.lua_extend = redis.register_script(cls.LUA_EXTEND_SCRIPT)

    def do_acquire(self, token):
        timeout = self.timeout and int(self.timeout * 1000) or ''
        return bool(self.lua_acquire(keys=[self.name],
                                     args=[token, timeout],
                                     client=self.redis))

    def do_release(self, expected_token):
        if not bool(self.lua_release(keys=[self.name],
                                     args=[expected_token],
                                     client=self.redis)):
            raise LockError("Cannot release a lock that's no longer owned")

    def do_extend(self, additional_time):
        additional_time = int(additional_time * 1000)
        if not bool(self.lua_extend(keys=[self.name],
                                    args=[self.local.token, additional_time],
                                    client=self.redis)):
            raise LockError("Cannot extend a lock that's no longer owned")
        return True


if __name__ == '__main__':
    conn = RedisPool().connection()

    with RedisLuaLock(conn, 'hello_world', timeout=15, blocking=True, blocking_timeout=1):
        # do something
        print 'xxx'
        time.sleep(3)
