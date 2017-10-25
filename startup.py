# coding:utf8
import os
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.options import options, define
from tornado.web import Application
from tornado.wsgi import WSGIApplication
from tornado.web import RequestHandler
from gevent.pywsgi import WSGIServer
from gevent import monkey
monkey.patch_all()

from app_base.app_log import enable_pretty_logging, logging

from handlers.base_handler import ErrorHandler
from handlers import handler_url, handler_html, handler_login,\
    handler_anchor_login, handler_third, handler_anchor, handler_client

from settings import DEBUG_PROJECT, BASE_DIR


def prepare(self):
    self.set_header('Access-Control-Allow-Origin', '*')
    self.set_header("Access-Control-Allow-Headers", "x-requested-with")
    self.set_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

RequestHandler.prepare = prepare
define(name='port', default=2050, type=int, help='run on the given port')


def get_application():
    kwargs = dict(
        handlers=[
            (r'/v1/data/user/login$', handler_login.LoginHandler),  # 用户登入
            (r'/v1/data/anchor/login$', handler_anchor_login.AnchorloginHandler),  # 主播登入
            (r'/v1/data/(.)*$', handler_url.UrlHandler),  # 要登入数据post请求
            (r'/v1/view/anchor/*(\w+)*(.html)$', handler_anchor.AnchorHandler),
            (r'/v1/view/client/*(\w+)*(.html)$', handler_client.ClientHandler),
            (r'/v1/view/(\w+)*/*(\w+)*(.html)$', handler_html.HtmlHandler),
            (r'/api/([\w\d]+)$', handler_third.ThirdHandler),  # 第三方请求
            (r'/.*$', ErrorHandler)
        ],
        template_path=os.path.join(BASE_DIR, 'web/templates'),
        static_path=os.path.join(BASE_DIR, 'web/static'),
        cookie_secret="voice_live_web",
        debug=DEBUG_PROJECT
    )
    if DEBUG_PROJECT:
        return Application(**kwargs)
    else:
        return WSGIApplication(**kwargs)

options.parse_command_line()
log_options = dict(
    log_level='WARN',
    log_to_stderr=True,
    log_dir=os.path.join(BASE_DIR, 'log'),
    log_file_prefix='voice_live_web_',
    log_file_postfix='.log',
    log_file_num_backups=20
)
enable_pretty_logging(options=log_options)

application = get_application()


def startup():
    print 'startup voice_live_web_ %s...' % options.port
    if DEBUG_PROJECT:
        http_server = HTTPServer(application, xheaders=True)
        http_server.listen(options.port)
        IOLoop().instance().start()
    else:
        WSGIServer(
            ('', options.port), application, log=None,
            error_log=logging.getLogger()
        ).serve_forever()

if __name__ == '__main__':
    startup()
