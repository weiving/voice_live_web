# coding:utf8
from Crypto.Hash import MD5


def md5_encrypt(s):
    md5 = MD5.new(s)
    return md5.hexdigest()


if __name__ == '__main__':
    print md5_encrypt('123')
