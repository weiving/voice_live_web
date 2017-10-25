# coding=utf-8

import pylzma


def char2hex(c):
    c = ord(c)
    if c < 0:
        c += 256
    return '%02x' % c


def hex2char(h):
    return h.decode('hex')


def chunks(seq, size):
    d, m = divmod(len(seq), size)
    for i in range(d):
        yield seq[i * size:(i + 1) * size]
    if m:
        yield seq[d * size:]


def dump(a):
    return ''.join([char2hex(c) for c in a])


def load(a):
    return ''.join([hex2char(c) for c in chunks(a, 2)])


def lzma_compress(s):
    return dump(pylzma.compress(s, dictionary=19, fastBytes=64, algorithm=2, eos=1, matchfinder='bt4'))


def lzma_decompress(s):
    return pylzma.decompress(load(s))


def lzma_is_compress(s):
    return s.startswith('5d00000800')


'''
aa = 'Hello, world.'
print 'aa', aa
bb = lzma_compress(aa)
print 'bb', bb
print 'aa is lzma:', lzma_is_compress(aa)
print 'bb is lzma:', lzma_is_compress(bb)
cc = lzma_decompress(bb)
print 'cc', cc
print 'aa equal cc:', aa == cc
'''
