# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string, get_remote_ip, sequence_to_string
from app_base.app_http_client import ll_http_client

from settings import SEVER_ADDRESS


class ThirdHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(ThirdHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        self.post(*args, **kwargs)

    def post(self, *args, **kwargs):
        params = {}
        for key, arguments in self.request.arguments.iteritems():
            params[get_string(key)] = arguments[-1]
        ip = self.get_remote_ip()
        device = self.request.headers.get('User-Agent', '')
        app_key = self.request.headers.get('AppKey')
        nonce = self.request.headers.get('Nonce')
        check_sum = self.request.headers.get('CheckSum')
        params_url = get_string(self.request.path)
        url = SEVER_ADDRESS + params_url
        parameter = {
            'ip': ip,
            'device': device,
            'app_key': app_key,
            'nonce': nonce,
            'check_sum': check_sum
        }
        data = dict(parameter, **params)
        result = ll_http_client(url, data)
        return self.write(sequence_to_string(result))

    def get_remote_ip(self):
        return get_remote_ip(self)
