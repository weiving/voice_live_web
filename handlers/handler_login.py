# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string, get_remote_ip, sequence_to_string
from app_base.app_http_client import ll_http_client

from settings import SEVER_ADDRESS


class LoginHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(LoginHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        self.post(*args, **kwargs)

    def post(self, *args, **kwargs):
        params = {}
        for key, arguments in self.request.arguments.iteritems():
            params[get_string(key)] = arguments[-1]
        ip = self.get_remote_ip()
        device = self.request.headers.get('User-Agent', '')
        url = SEVER_ADDRESS + '/user/login'
        params['ip'] = ip
        params['device'] = device
        result = ll_http_client(url, params)
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
        return self.write(sequence_to_string(result))

    def get_remote_ip(self):
        return get_remote_ip(self)
