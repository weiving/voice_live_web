# coding:utf8
from ipip import get_ip_address

from app_base.utils import get_string
from app_base.app_lru import lru_cache_function
from app_base.app_db import db_conn_guard, db_query_for_paging
from app_base.app_log import warn


@lru_cache_function(expiration=10 * 60)
def _reformat_ip_address(ip):
    try:
        ip_address = get_string(get_ip_address(ip))
        ls = []
        for _ia in ip_address.split('\t'):
            if _ia and _ia not in ls:
                ls.append(_ia)
        return ''.join(ls)
    except Exception, e:
        warn(15100, 'reformat_ip_address', '', ip, get_string(e))
        return ''


# 添加ip并增加ip地址
def add_ip(ip, user_id=''):
    result = False
    with db_conn_guard(dict_cursor=True) as conn:
        sql, args = '', ()
        try:
            sql = 'SELECT * FROM t_log_ip_user WHERE user_id=%s AND ip=%s'
            ip_user = conn.execute_fetchone(sql, (user_id, ip))
            if ip_user:
                log_id = ip_user.get('log_id')
                ip_address = ip_user.get('ip_address')
                sql = '''
                  UPDATE t_log_ip_user SET count=count+1{0}
                  WHERE log_id=%s
                '''.format('' if ip_address else ', ip_address=%s')
                args = log_id if ip_address else (_reformat_ip_address(ip), log_id)
            else:
                sql = '''
                  INSERT INTO t_log_ip_user
                  (user_id, ip, ip_address, count)
                  VALUES (%s, %s, %s, 1)
                '''
                args = (user_id, ip, _reformat_ip_address(ip))
            count = conn.execute_rowcount(sql, args)
            if count:
                sql = 'SELECT * FROM t_log_ip_count WHERE ip=%s'
                ip_count = conn.execute_fetchone(sql, ip)
                if ip_count:
                    ip_address = ip_count.get('ip_address')
                    sql = '''
                      UPDATE t_log_ip_count SET count=count+1{0}
                      WHERE ip=%s
                    '''.format('' if ip_address else ', ip_address=%s')
                    args = ip if ip_address else (_reformat_ip_address(ip), ip)
                else:
                    sql = '''
                      INSERT INTO t_log_ip_count
                      (ip, ip_address, count)
                      VALUES (%s, %s, 1)
                    '''
                    args = (ip, _reformat_ip_address(ip))
                count = conn.execute_rowcount(sql, args)
                if count:
                    result = conn.commit()
        except Exception, e:
            warn(15101, 'add_ip_log', sql, 'ip=%s, user_id=%s' % (ip, user_id), get_string(e))
            conn.rollback()
            print e
    return result


def find_user_ip(page_index, page_size, user_id=None, ip=''):
    sql = 'FROM t_log_ip_user WHERE 1'
    args = []
    if user_id is not None:
        sql += ' AND user_id=%s'
        args.append(user_id)
    if ip:
        sql += ' AND ip LIKE %s'
        args.append(ip + '%')
    return db_query_for_paging(sql, page_index, page_size, args, order_by_field='count')


def find_ip_count(page_index, page_size, ip=''):
    sql = 'FROM t_log_ip_count WHERE 1'
    args = []
    if ip:
        sql += ' AND ip LIKE %s'
        args.append(ip + '%')
    return db_query_for_paging(sql, page_index, page_size, args, order_by_field='count')


if __name__ == '__main__':
    # print _reformat_ip_address('47.52.20.169')
    # print _reformat_ip_address('127.0.0.1')
    print add_ip('127.0.0.61', '1111')
    # print find_user_ip(1, 2, '')
    # print find_ip_count(1, 2)
