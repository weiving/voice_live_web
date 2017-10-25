# coding:utf8
import os
import sys
from traceback import format_exc
from datetime import datetime, timedelta
import time

from app_base.app_db import db_conn_guard, db_query_for_int, db_query_for_dict, db_insert,\
    R_KEY_SEPARATE, R_SHARDING_TB
from app_base.app_log import enable_pretty_logging, warn
from app_base.utils import get_date_string, get_int

from app_base.app_redis import set_cache, get_cache

from settings import SHARDING_TABLES

_default_once_rows = 2000


def _sharding_tables(sharding_tb=None):
    calc_time = datetime.now()
    execute_tables = {sharding_tb: SHARDING_TABLES.get(sharding_tb)} \
        if sharding_tb and SHARDING_TABLES.get(sharding_tb) else SHARDING_TABLES
    for table_name, table_conf in execute_tables.iteritems():
        table_name = table_name.lower()
        redis_key = R_KEY_SEPARATE.join([R_SHARDING_TB, table_name])
        redis_value = get_cache(redis_key, None) or []

        time_field = table_conf.get('field')
        primary_key = table_conf.get('primary_key')
        day_separate = table_conf.get('day_separate')
        separate_len = len(day_separate)
        for i in xrange(separate_len):
            from_days = day_separate[i]
            tb_from = '%s_%s' % (table_name, from_days) if i > 0 else table_name
            if len(redis_value) <= i:
                redis_value.append({'table_name': tb_from})

            to_days = day_separate[i+1] if i < (separate_len-1) else 'history'
            tb_to = '%s_%s' % (table_name, to_days)
            if not _check_table_exist(tb_to):
                db_insert('CREATE TABLE %s LIKE %s' % (tb_to, table_name))
            if len(redis_value) <= (i+1):
                redis_value.append({'table_name': tb_to})

            min_time = calc_time - timedelta(days=from_days)
            time_min = get_date_string(min_time) + '235959'
            count_sql = 'SELECT COUNT(*) AS count FROM {0} WHERE {1}<=%s'.format(
                tb_from, time_field
            )
            count = db_query_for_int(count_sql, time_min)

            query_id_sql = 'SELECT MAX({0}) FROM {1}'.format(primary_key, tb_to)
            del_sql = 'DELETE FROM {0} WHERE {1}<=%s'.format(tb_from, primary_key)
            query_value_sql = '''
              SELECT MIN({0}) AS id_min, MAX({0}) AS id_max,
                MIN({1}) AS time_min, MAX({1}) AS time_max
              FROM %s
            '''.format(primary_key, time_field)

            result = True
            moved_rows = 0
            _once_rows = get_int(_default_once_rows)
            while result and count > moved_rows:
                insert_sql = '''
                      INSERT INTO {0} SELECT * FROM {1} WHERE {2}<=%s ORDER BY {3} ASC LIMIT {4}
                    '''.format(tb_to, tb_from, time_field, primary_key, _once_rows)
                t = time.time()
                try:
                    with db_conn_guard(dict_cursor=True) as db_conn:
                        db_conn.insert(insert_sql, time_min)
                        max_id = db_conn.query_for_str(query_id_sql)
                        row_count = db_conn.delete(del_sql, max_id)
                        if row_count:
                            db_conn.commit()
                            result = True

                            d = time.time() - t
                            if d >= 1:
                                _once_rows -= 100
                                if _once_rows < 100:
                                    _once_rows = 100
                            elif d <= 0.2:
                                _once_rows += 1000

                            from_rs = db_conn.execute_fetchone(query_value_sql % tb_from) or {}
                            redis_value[-2].update(from_rs)

                            to_rs = db_conn.execute_fetchone(query_value_sql % tb_to) or {}
                            redis_value[-1].update(to_rs)

                            set_cache(redis_key, redis_value)
                            moved_rows += row_count
                        else:
                            result = False
                except Exception, e:
                    print e
                    result = False
                if result:
                    moved_rows += _once_rows
                et = time.time()
                print 'sharding table data: %s ==> %s; progress: %s / %s; used %s' % (
                    tb_from, tb_to, moved_rows, count, et-t)
            count_sql = '''
              SELECT MIN({0}) AS id_min, MAX({0}) AS id_max,
                MIN({1}) AS time_min, MAX({1}) AS time_max
              FROM %s
            '''.format(primary_key, time_field)
            from_value = db_query_for_dict(count_sql % tb_from)
            redis_value[i].update(from_value)
            to_value = db_query_for_dict(count_sql % tb_to)
            redis_value[i+1].update(to_value)
            if to_value.get('id_max') and not redis_value[0].get('id_min'):
                redis_value[0]['id_min'] = get_int(to_value.get('id_max')) + 1
                redis_value[0]['time_min'] = get_date_string(calc_time - timedelta(day_separate[0]-1)) + '000000'
                redis_value[0]['time_max'] = get_date_string() + '235959'
            set_cache(redis_key, redis_value, 24*60*60)
        print 'finished sharding table:', table_name
    print 'Done...'


def _check_table_exist(table_name):
    return db_query_for_dict('DESC %s' % table_name)


def _merge_table_data():
    for table_name, table_conf in SHARDING_TABLES.iteritems():
        table_name = table_name.lower()
        redis_key = R_KEY_SEPARATE.join([R_SHARDING_TB, table_name])

        primary_key = table_conf.get('primary_key')
        day_separate = table_conf.get('day_separate')
        separate_len = len(day_separate)
        for i in xrange(1, separate_len+1):
            from_days = day_separate[i] if i < separate_len else 'history'
            tb_from = '%s_%s' % (table_name, from_days)
            moved_rows = 0
            if _check_table_exist(tb_from):
                count = db_query_for_int(
                    'SELECT COUNT(*) AS count FROM %s' % tb_from
                )
                result = True
                while result and count > moved_rows:
                    sql = 'INSERT INTO %s SELECT * FROM %s ORDER BY %s DESC LIMIT %s, %s' % (
                        table_name, tb_from, primary_key, moved_rows, _default_once_rows)
                    result = db_insert(sql)
                    if result:
                        moved_rows += _default_once_rows
                    print 'merge table data: %s ==> %s / %s' % (tb_from, moved_rows, count)
        set_cache(redis_key, None, 1)
        print 'finished merge table:', table_name
    print 'Done...'


if __name__ == '__main__':
    try:
        log_options = dict(
            log_level='INFO',
            log_to_stderr=True,
            log_dir=os.path.abspath('log'),
            log_file_prefix='sharding_tables',
            log_file_postfix='.log',
            log_file_num_backups=20
        )
        enable_pretty_logging(options=log_options)
        table = sys.argv[1] if len(sys.argv) > 1 else None
        _sharding_tables(table)
        # _merge_table_data(table)
    except Exception, main_e:
        warn(0, 'sharding table', sys.argv, main_e.message, format_exc())
