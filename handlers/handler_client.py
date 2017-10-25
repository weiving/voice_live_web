# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string


class ClientHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(ClientHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        html_name = get_string(args[0]) if len(args) > 0 else ''
        self.render('client/%s.html' % html_name)
