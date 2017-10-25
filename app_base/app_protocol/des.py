# coding:utf8
from Crypto.Cipher import DES
from Crypto import Random
import base64
import re


def des_encrypt(des_key, s):
    block_size = DES.block_size
    pad = block_size - (len(s) % block_size)
    s += chr(pad) * pad
    iv = Random.OSRNG.posix.new().read(DES.block_size)
    return re.sub(re.compile('\s*'), '', DES.new(des_key, DES.MODE_ECB, iv).encrypt(s).encode('base64'))


def des_decrypt(des_key, s):
    iv = Random.OSRNG.posix.new().read(DES.block_size)
    s = DES.new(des_key, DES.MODE_ECB, iv).decrypt(s.decode('base64'))
    return s.rstrip('\x00\x01\x02\x03\x04\x05\x06\x07\x08')


def des_urlsafe_encrypt(des_key, s):
    block_size = DES.block_size
    pad = block_size - (len(s) % block_size)
    s += chr(pad) * pad
    iv = Random.OSRNG.posix.new().read(DES.block_size)
    return re.sub(re.compile('\s*'), '', base64.urlsafe_b64encode(
        DES.new(des_key, DES.MODE_ECB, iv).encrypt(s)))


def des_urlsafe_decrypt(des_key, s):
    iv = Random.OSRNG.posix.new().read(DES.block_size)
    s = DES.new(des_key, DES.MODE_ECB, iv).decrypt(base64.urlsafe_b64decode(s))
    return s.rstrip('\x00\x01\x02\x03\x04\x05\x06\x07\x08')


if __name__ == '__main__':
    t_des = des_encrypt('12345678', '123+456')
    t_des = '7a41a0f05317aba9c89275bd8107d7cc'
    print des_decrypt('l^4iz~w.', t_des)
