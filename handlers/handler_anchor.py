# coding:utf-8
from tornado.web import RequestHandler

from app_base.utils import get_string


class AnchorHandler(RequestHandler):
    def __init__(self, application, request, **kwargs):
        super(AnchorHandler, self).__init__(application, request)

    def get(self, *args, **kwargs):
        html_name = get_string(args[0]) if len(args) > 0 else ''
        channel_id = ''
        redis_token = ''
        c_token = self.get_secure_cookie('anchor_token')
        channel_token = ''
        if c_token:
            token = eval(c_token)
            channel_id = get_string(token.get('channel_id'))
            redis_token = get_string(token.get('redis_token'))
            channel_token = get_string(token.get('channel_token'))
        if html_name:
            if channel_id and redis_token:
                self.render('anchor/%s.html' % html_name, channel_id=channel_id,
                            redis_token=redis_token, channel_token=channel_token)
            else:
                self.render('hlogin.html')
            return
        else:
            # 会首页
            self.render('hlogin.html')
            return
