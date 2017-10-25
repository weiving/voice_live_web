# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string
from app_base.app_http_client import ll_http_client

from settings import SEVER_ADDRESS


class HtmlHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(HtmlHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        html_file = get_string(args[0]) if len(args) > 0 else ''
        html_name = get_string(args[1]) if len(args) > 1 else ''
        web_token = self.request.arguments.get('web_token')
        user_id = ''
        username = ''
        redis_token = ''
        if web_token:
            # 跨服务器登入验证
            # 发送请求获取登入数据设置user——id
            web_token = get_string(web_token[0])
            url = SEVER_ADDRESS + '/external/check_login'
            parameter = {
                'web_token': web_token,
            }
            result = ll_http_client(url, parameter)
            if result.get('code') == '200':
                user_id = get_string(result.get('user_id'))
                username = get_string(result.get('username'))
                redis_token = get_string(result.get('redis_token'))
                token = {
                    'user_id': user_id,
                    'username': username,
                    'redis_token': redis_token
                }
                self.set_secure_cookie("user_token", get_string(token), expires_days=1)
        else:
            c_token = self.get_secure_cookie('user_token')
            if c_token:
                token = eval(c_token)
                user_id = get_string(token.get('user_id'))
                username = get_string(token.get('username'))
                redis_token = get_string(token.get('redis_token'))

        if html_file and html_name:
            if user_id and username and redis_token:
                self.render('%s/%s.html' % (html_file, html_name),
                            user_id=user_id, username=username, token=redis_token)
            else:
                # 需要保护的尾灯如不让进取
                self.render('index.html')
            return
        elif html_file:
            # 跳转不需要保护
            if user_id and username and redis_token:
                self.render('%s.html' % html_file, user_id=user_id, username=username, token=redis_token)
            else:
                self.render('%s.html' % html_file)
            return
        else:
            # 会首页
            self.render('index.html')
            return
