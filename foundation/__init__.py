# coding:utf8

'''
    常用/公共函数包
'''
from app_base.utils import get_string
from app_base.app_protocol.md5 import md5_encrypt
import time
import random


def get_result(code=200, msg='', **kwargs):
    '''
        :param code: 0-成功, !0-失败(错误码)
        :param msg: 返回说明
        :param kwargs: 额外返回值(a=1, b=2)
        :return:
    '''
    result = {
        'code': code, 'msg': msg,
    }
    for k, v in kwargs.iteritems():
        result[k] = v
    return result


# 时间错加参数加随机数md5加密算法
def generate_token(parma):
    try:
        now = time.time()
        count = get_string(random.uniform(0, 10000))
        key = get_string(parma) + get_string(now) + count
        token = md5_encrypt(key)
        return get_string(token)
    except Exception, e:
        print e


if __name__ == '__main__':
    print generate_token('123')
