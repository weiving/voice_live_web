# coding=utf-8
from contextlib import contextmanager
from decimal import Decimal
from datetime import datetime, timedelta

from app_base.utils import get_int, get_string, get_decimal, get_time_string, get_date_string
from app_base.app_redis import get_cache, set_cache

from app_base.app_db.db_pool import DBConn

try:
    from settings import SHARDING_TABLES
except:
    SHARDING_TABLES = {}

R_KEY_SEPARATE = ':'
R_SHARDING_TB = 'sharding_tb'


def get_page_size(page_size, max_page_size=500):
    if isinstance(page_size, dict):
        _page_size = get_int(page_size.get('page_size'))
    else:
        _page_size = get_int(page_size)
    if not _page_size:
        _page_size = 15
    return min(_page_size, max_page_size)


def calc_list_page(total_count, page_index, page_size):
    page_size = get_int(page_size)
    total_page = (total_count + page_size - 1) / page_size
    page_index = get_int(page_index, 1)
    if page_index > total_page:
        page_index = total_page
    if page_index <= 0:
        page_index = 1
    return total_page, page_index, (page_index - 1) * page_size


def init_paging_result(total_count, page_size):
    return {'total_count': total_count, 'page_size': page_size}


def format_paging_result(result, page_index, total_page, start, data):
    result['page_index'] = page_index
    result['total_page'] = total_page
    result['start'] = start + 1
    result['data'] = data
    return result


def db_time_formatter(data, time_fields=()):
    def _formatter(d):
        if isinstance(time_fields, str):
            d[time_fields] = get_time_string(d.get(time_fields))
        elif isinstance(time_fields, (list, tuple)):
            for field in time_fields:
                d[field] = get_time_string(d.get(field, ''))
        return d

    if isinstance(data, dict):
        _formatter(data)
    elif isinstance(data, (list, tuple)):
        for _d in data:
            _formatter(_d)
    elif isinstance(data, datetime):
        data = get_time_string(data)
    return data


def get_table_name_list(tb_name, query_id=None, time_min=None, time_max=None):
    table_name_list = []
    if not tb_name:
        return False, table_name_list
    query_id = get_int(query_id)
    int_time_min = get_int(time_min)
    int_time_max = get_int(time_max)
    if int_time_max and int_time_min > int_time_max:
        return True, table_name_list

    tb_name = tb_name.lower()
    tb_setting = SHARDING_TABLES.get(tb_name, {})
    if tb_setting:
        redis_key = R_KEY_SEPARATE.join([R_SHARDING_TB, tb_name])
        redis_value = get_cache(redis_key, 24*60*60)

        primary_key = tb_setting.get('primary_key')
        time_field = tb_setting.get('field')
        if not redis_value:  # 如果redis中没有分表的信息，生成分表信息，并存放到redis
            redis_value = []
            day_separate = tb_setting.get('day_separate', [])
            separate_len = len(day_separate)
            count_sql = '''
              SELECT MIN({0}) AS id_min, MAX({0}) AS id_max,
                MIN({1}) AS time_min, MAX({1}) AS time_max
              FROM %s
            '''.format(primary_key, time_field)
            with db_conn_guard(dict_cursor=True) as conn:
                for i in xrange(separate_len):
                    from_days = day_separate[i]
                    query_tb = '%s_%s' % (tb_name, from_days) if i > 0 else tb_name
                    tb_value = conn.execute_fetchone(count_sql % query_tb)
                    if not tb_value or not tb_value.get('time_min'):
                        tb_value = {}
                    if not tb_value.get('time_min'):
                        if i == 0:
                            begin_time = datetime.now() - timedelta(days=from_days-1)
                            tb_value = {
                                'id_min': 0, 'id_max': 0,
                                'time_min': get_date_string(begin_time) + '000000',
                                'time_max': get_date_string() + '235959'
                            }
                        else:
                            tb_value = {}
                    elif i > 0 and not redis_value[0].get('id_min') and tb_value.get('id_max'):
                        redis_value[0]['id_min'] = get_int(tb_value.get('id_max')) + 1
                    tb_value['table_name'] = query_tb
                    redis_value.append(tb_value)
                    set_cache(redis_key, redis_value, 24*60*60)

                    if i == (separate_len - 1):
                        query_tb_1 = '%s_%s' % (tb_name, 'history')
                        tb_value_1 = conn.execute_fetchone(count_sql % query_tb_1)
                        if not tb_value_1:
                            tb_value_1 = {}
                        tb_value_1['table_name'] = query_tb_1
                        redis_value.append(tb_value_1)
                        set_cache(redis_key, redis_value, 24*60*60)

        # 从redis的分表信息中查找符合查询条件的表名
        redis_len = len(redis_value)
        for i in xrange(redis_len):
            rv = redis_value[i]
            tn = get_string(rv.get('table_name'))
            if query_id:  # 根据编号查询
                id_min = get_int(rv.get('id_min'))
                id_max = get_int(rv.get('id_max'))
                if (i == 0 and query_id >= id_min) or (id_min <= query_id <= id_max):
                    table_name_list = [tn]
                    break
            elif int_time_min or int_time_max:  # 根据时间查询
                tb_time_min = get_int(rv.get('time_min'))
                tb_time_max = get_int(rv.get('time_max'))
                if tb_time_min:
                    if tn == tb_name:  # 如果是热表且时间大于热表最小时间，则需要查询热表
                        if tb_time_min and (tb_time_min <= int_time_min
                                            or tb_time_min <= int_time_max):
                            table_name_list.append(tn)
                    else:
                        if tb_time_min <= int_time_max <= tb_time_max:
                            table_name_list.append(tn)
                            if not int_time_min:
                                break
                        elif tb_time_min <= int_time_min <= tb_time_max:
                            table_name_list.append(tn)
                            break
                        elif tb_time_max < int_time_min:
                            break
                        elif tb_time_min <= int_time_max and int_time_min:
                            table_name_list.append(tn)
            else:
                table_name_list.append(tn)
        return True, table_name_list

    return False, [tb_name]


def get_table_name(tb_name, query_id):
    is_sharding, table_name_list = get_table_name_list(tb_name, query_id)
    if is_sharding:
        return table_name_list[-1] if table_name_list else ''
    return tb_name


@contextmanager
def db_conn_guard(dict_cursor=False, server_cursor=False):
    conn = DBConn(dict_cursor, server_cursor)
    yield conn
    conn.close()


def db_insert(query, args=None):
    with db_conn_guard() as conn:
        result = conn.insert(query, args)
        if result:
            conn.commit()
    return result


def db_insert_lastrowid(query, args=None):
    with db_conn_guard() as conn:
        result = conn.insert_lastrowid(query, args)
        if result:
            conn.commit()
    return result


def db_insert_many(query, args=None):
    with db_conn_guard() as conn:
        result = conn.insert_many(query, args)
        if result:
            conn.commit()
    return result


# 冷热表sql: UPDATE $$tb_name$$ SET a=%s WHERE query_id=%s
def db_update(query, args=None, tb_name='',
              query_id=None, time_min=None, time_max=None):
    result = 0

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard() as conn:
        if table_list:
            for tn in table_list:
                sql = query.replace('$$tb_name$$', tn)
                result += conn.update(sql, args)
        else:
            result = conn.update(query, args)
        if result:
            conn.commit()
    return result


# 冷热表sql: UPDATE $$tb_name$$ SET a=%s WHERE query_id=%s
def db_update_many(query, args=None, tb_name='',
                   query_id=None, time_min=None, time_max=None):
    result = 0

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard() as conn:
        if table_list:
            for tn in table_list:
                sql = query.replace('$$tb_name$$', tn)
                result += conn.update_many(sql, args)
        else:
            result = conn.update_many(query, args)
        if result:
            conn.commit()
    return result


# 冷热表sql: DELETE FROM $$tb_name$$ WHERE query_id=%s
def db_delete(query, args=None, tb_name='',
              query_id=None, time_min=None, time_max=None):
    result = 0

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard() as conn:
        if table_list:
            for tn in table_list:
                sql = query.replace('$$tb_name$$', tn)
                result += conn.delete(sql, args)
        else:
            result = conn.delete(query, args)
        if result:
            conn.commit()
    return result


# 冷热表查询sql: SELECT field FROM $$tb_name$$ WHERE query_id=%s
def db_query_for_one(sql, args=None, tb_name='',
                     query_id=None, time_min=None, time_max=None):
    result = None

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard() as conn:
        if table_list:
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                result = conn.execute_fetchone(query_sql, args)
                if result:
                    break
        else:
            result = conn.execute_fetchone(sql, args)
    return result


# 冷热表查询sql: SELECT * FROM $$tb_name$$ WHERE time>=%s AND time<=%s ORDER BY a ASC/DESC
def db_query_for_all(sql, args=None, tb_name='', count=0, order_by='DESC',
                     query_id=None, time_min=None, time_max=None):
    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return None

    with db_conn_guard() as conn:
        if table_list:
            data = []
            if order_by.upper() == 'ASC':
                table_list.reverse()
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                if count:
                    query_sql += ' LIMIT 0, %s' % (count - len(data))
                query_data = conn.execute_fetchall(query_sql, args)
                if not query_data:
                    query_data = []
                data += query_data
                if count and count == len(data):
                    break
        else:
            data = conn.execute_fetchall(sql, args)
    return data


# 冷热表查询sql: SELECT field FROM $$tb_name$$ WHERE query_id=%s
def db_query_for_int(sql, args=None, default=0, tb_name='',
                     query_id=None, time_min=None, time_max=None):
    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return default

    with db_conn_guard() as conn:
        result = [default]
        if table_list:
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                result = conn.execute_fetchone(query_sql, args)
                if result:
                    break
        else:
            result = conn.execute_fetchone(sql, args)
        if not (result and isinstance(result, tuple) and len(result)):
            result = [default]
    return get_int(result[0], default)


# 冷热表查询sql: SELECT field FROM $$tb_name$$ WHERE query_id=%s
def db_query_for_str(sql, args=None, default='', tb_name='',
                     query_id=None, time_min=None, time_max=None):
    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return default

    with db_conn_guard() as conn:
        if table_list:
            result = ''
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                result = conn.query_for_str(query_sql, args)
                if result:
                    break
        else:
            result = conn.query_for_str(sql, args)
    return get_string(result, default) or default


# 冷热表查询sql: SELECT field FROM $$tb_name$$ WHERE query_id=%s
def db_query_for_decimal(sql, args=None, default=Decimal(0), tb_name='',
                         query_id=None, time_min=None, time_max=None):
    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return default

    with db_conn_guard() as conn:
        result = [default]
        if table_list:
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                result = conn.execute_fetchone(query_sql, args)
                if result:
                    break
        else:
            result = conn.execute_fetchone(sql, args)
        if not (result and isinstance(result, tuple) and len(result)):
            result = [default]
    return get_decimal(result[0])


# 冷热表查询sql: SELECT * FROM $$tb_name$$ WHERE query_id=%s
def db_query_for_dict(sql, args=None, tb_name='',
                      query_id=None, time_min=None, time_max=None):
    result = {}

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard(dict_cursor=True) as conn:
        if table_list:
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                result = conn.execute_fetchone(query_sql, args)
                if result:
                    break
        else:
            result = conn.execute_fetchone(sql, args)
        if not result:
            result = {}
    return result


# 冷热表查询sql: SELECT * FROM $$tb_name$$ WHERE time>=%s AND time<=%s ORDER BY a ASC/DESC
def db_query_for_list(sql, args=None, tb_name='', count=0, order_by='DESC',
                      query_id=None, time_min=None, time_max=None):
    result = []

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard(dict_cursor=True) as conn:
        if table_list:
            if order_by.upper() == 'ASC':
                table_list.reverse()
            for tn in table_list:
                query_sql = sql.replace('$$tb_name$$', tn)
                if count:
                    query_sql += ' LIMIT 0, %s' % (count - len(result))
                query_data = conn.execute_fetchall(query_sql, args)
                if not query_data:
                    query_data = []
                result += query_data
                if count and count == len(result):
                    break
        else:
            result = conn.execute_fetchall(sql, args)
            if not result:
                result = []
    return result


# 冷热表查询sql: FROM $$tb_name$$ WHERE time>=%s AND time<=%s
def db_query_for_paging(sql, page_index, page_size, args=None, fields='*',
                        order_by_field='', order_by='DESC', count_name='*',
                        tb_name='', query_id=None, time_min=None, time_max=None):
    page_size = get_page_size(page_size)
    result = init_paging_result(0, page_size)

    is_sharding, table_list = get_table_name_list(tb_name, query_id, time_min, time_max)
    if is_sharding and not table_list:
        return result

    with db_conn_guard(dict_cursor=True) as conn:
        if table_list:
            total_count, total_page, start = 0, 0, 0
            data = []

            if order_by.upper() == 'ASC':
                table_list.reverse()
            table_len = len(table_list)
            for i in xrange(table_len):
                tn = table_list[i]
                query_sql = sql.replace('$$tb_name$$', tn)
                count_sql = ' '.join(['SELECT COUNT(%s) AS count' % count_name, query_sql])
                count_rs = conn.execute_fetchone(count_sql, args)
                count = get_int(count_rs.get('count')) if count_rs else 0
                total_page, tmp_page_index, start = calc_list_page(total_count+count, page_index, page_size)
                if i == (table_len - 1):
                    page_index = tmp_page_index
                if len(data) < page_size and tmp_page_index <= total_page:
                    query_start = start - total_count + len(data)
                    query_size = page_size - len(data)
                    list_sql = ' '.join([
                        'SELECT', fields, query_sql,
                        ' '.join(['ORDER BY', order_by_field, order_by]) if order_by_field else '',
                        'LIMIT %s, %s' % (query_start, query_size)
                    ])
                    query_data = conn.execute_fetchall(list_sql, args)
                    if not query_data:
                        query_data = []
                    data += query_data
                total_count += count

            result['total_count'] = total_count
            result = format_paging_result(result, page_index, total_page, start, data)
        else:
            count_sql = ' '.join(['SELECT COUNT(%s) AS count' % count_name, sql])
            count_rs = conn.execute_fetchone(count_sql, args)
            total_count = get_int(count_rs.get('count')) if count_rs else 0
            result = init_paging_result(total_count, page_size)
            if total_count:
                total_page, page_index, start = calc_list_page(total_count, page_index, page_size)
                list_sql = ' '.join([
                    'SELECT', fields, sql,
                    ' '.join(['ORDER BY', order_by_field, order_by]) if order_by_field else '',
                    'LIMIT %s, %s' % (start, page_size)
                ])
                data = conn.execute_fetchall(list_sql, args)
                if not data:
                    data = []
                result = format_paging_result(result, page_index, total_page, start, data)
    return result


def db_get_database_time(conn=None):
    sql = 'SELECT DATE_FORMAT(NOW(),"%Y%m%d%H%i%s");'
    ret = conn.query_for_str(sql) if conn else db_query_for_str(sql)
    return ret


if __name__ == '__main__':
    pass
