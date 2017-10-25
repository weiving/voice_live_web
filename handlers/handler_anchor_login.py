# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string, get_remote_ip, sequence_to_string
from app_base.app_http_client import ll_http_client

from settings import SEVER_ADDRESS


class AnchorloginHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(AnchorloginHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        self.post(*args, **kwargs)

    def post(self, *args, **kwargs):
        params = {}
        for key, arguments in self.request.arguments.iteritems():
            params[get_string(key)] = arguments[-1]
        ip = self.get_remote_ip()
        device = self.request.headers.get('User-Agent', '')
        url = SEVER_ADDRESS + '/anchor/login'
        params['ip'] = ip
        params['device'] = device
        result = ll_http_client(url, params)
        if result.get('code') == '200':
            channel_id = get_string(result.get('channel_id'))
            redis_token = get_string(result.get('redis_token'))
            channel_token = get_string(result.get('channel_token'))
            token = {
                'channel_id': channel_id,
                'redis_token': redis_token,
                'channel_token': channel_token
            }
            self.set_secure_cookie("anchor_token", get_string(token), expires_days=1)
        return self.write(sequence_to_string(result))

    def get_remote_ip(self):
        return get_remote_ip(self)
