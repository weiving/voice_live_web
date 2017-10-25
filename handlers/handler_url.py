# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string, get_remote_ip, sequence_to_string
from app_base.app_http_client import ll_http_client

from settings import SEVER_ADDRESS


class UrlHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(UrlHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        self.post(*args, **kwargs)

    def post(self, *args, **kwargs):
        params = {}
        for key, arguments in self.request.arguments.iteritems():
            params[get_string(key)] = arguments[-1]
        ip = self.get_remote_ip()
        device = self.request.headers.get('User-Agent', '')
        headers_token = self.request.headers.get('Token', '')
        user_token = self.get_secure_cookie('user_token')
        anchor_token = self.get_secure_cookie('anchor_token')
        flag_url = get_string(self.request.path).split('/')[3]
        login_token = {}
        if user_token:
            login_token = eval(user_token)
        if anchor_token and flag_url == 'anchor':
            login_token = eval(anchor_token)
        if headers_token and flag_url == 'anchor':
            login_token = {
                'redis_token': headers_token
            }
        params_url = get_string(self.request.path).split('/v1/data')[1]
        url = SEVER_ADDRESS + params_url
        if login_token and isinstance(login_token, dict):
            url = url + '/' + login_token.get('redis_token')
        else:
            url = url + '/' + 'no_redis_token'
        params['ip'] = ip
        params['device'] = device
        result = ll_http_client(url, params)
        return self.write(sequence_to_string(result))

    def get_remote_ip(self):
        return get_remote_ip(self)
