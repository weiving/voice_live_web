# coding:utf8
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DEBUG_PROJECT = False

DB_KWARGS = dict(
)

REDIS_CONFIG = {
}

SHARDING_TABLES = dict(
    table_name=dict(
        field='',  # 时间字段
        primary_key='',  # 主键
        day_separate=[]  # [天数1, 天数2]
    )
)

SEVER_ADDRESS = 'http://192.168.0.25:2000'
