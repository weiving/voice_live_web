var client = (function () {
    var talk_list = $('#talk-list'),
        msg_popover = $('#msg-popover'),
        msg_popover_content = $('#msg-popover .popover-content'),
        popover_btn = $('#popover-btn'),
        mask = $('.ui-mask'),
        msg_input = $('#msg-input'),
        send_btn = $('#send-btn'),
        start_live = $('#start-live'),
        stop_live = $('#stop-live'),
        hostessInfo_img = $(".hostessInfo img"),
        house_name = $(".hostessInfo .house-name"),
        hostess_name = $(".hostessInfo .hostess-name"),
        online_num = $(".onlineInfo .online-num"),
        player_status = $(".onlineInfo .player-status")
    ;

    var user_id,
        username,
        token = GetUrlParam("token"),
        channel_info;

    //滚动条位置
    function scrollbar() {
        var height = parseFloat(talk_list.height());//div高度
        var scrollTop = parseFloat(talk_list[0].scrollTop);//滚动条的高度
        var scrollHeight = parseFloat(talk_list[0].scrollHeight);//滚动条需要滚动的高度
        if (height + scrollTop < scrollHeight) {
            talk_list.scrollTop(scrollHeight);
        }
    }

    function center(obj) {
        var windowWidth = document.documentElement.clientWidth;
        var windowHeight = document.documentElement.clientHeight;
        var popupHeight = $(obj).height();
        var popupWidth = $(obj).width();
        $(obj).css({
            "position": "absolute",
            "top": (windowHeight - popupHeight) / 2 + $(document).scrollTop(),
            "left": (windowWidth - popupWidth) / 2
        });
    }

    //地址校验
    function GetUrlParam(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return decodeURI(r[2]);
        return null;
    }

    //评论验证
    function msgVaild(val) {
        if (val === "" || val === null) {
            msg_popover_content.html('评论不能为空！');
            msg_popover.fadeIn();
            center(msg_popover);
            mask.fadeIn();
            return false;
        } else if (val.length > 120) {
            msg_popover_content.html('评论内容不能超过120字！')
            msg_popover.fadeIn();
            center(msg_popover);
            mask.fadeIn();
            return false;
        } else {
            return true;
        }
    }

    //关闭弹出框
    function closePOP() {
        msg_popover.hide();
        mask.hide();
        msg_popover_content.html("");
    }

    //在线人数
    var onlineCount = function () {
        $.ajax({
            url: "/v1/data/client/client_online",
            type: "post",
            data: {"token": token},
            success: function (data) {
                if (data.code === "200") {
                    online_num.text(data.data);
                } else {
                    console.log("获取在线人数出错！");
                }
            }
        });
    };
    setInterval(onlineCount, 30000);

    return {
        //直播
        setPlay: function () {
            var options = {
                "controls": false,
                "autoplay": false,
                "poster": "/static/img/icon/header.png",
                "width": 1,
                "height": 1,
                "techOrder": ["flash", "html5"],
                controlBar: {
                    playToggle: false
                }
            }
            $.ajax({
                url: "/v1/data/client/client_get_channel_info",
                type: "post",
                data: {"token": token},
                async: false,
                success: function (data) {
                    if (data.code === "200") {
                        user_id = data.login_user_id;
                        username = data.login_username;
                        channel_info = data.data;
                        hostessInfo_img.attr('src', channel_info.image_url);
                        house_name.text(channel_info.channel_name);
                        hostess_name.text(channel_info.username);
                        $("title").text(channel_info.channel_name + "的房间");
                    } else if (data.code === "300") {
                        alert("系统异常!");
                    } else {
                        channel_info = {};
                    }
                }
            });

            //收听
            start_live.click(function () {
                if (!start_live.hasClass("text-color")) {
                    var html = '<video id="my-video" class="video-js" x-webkit-airplay="allow"\n' +
                        '       webkit-playsinline playsinline x5-playsinline=""\n' +
                        '       x5-video-player-type=\'h5\' x5-video-player-fullscreen=\'true\'\n' +
                        '       controls="true"\n' +
                        '       preload="auto" width="1" height="1" style="visibility: hidden"></video>';
                    $(".onlineInfo .player-btn").append(html);
                    var myPlayer = neplayer('my-video', options);
                    $(this).addClass("text-color");
                    stop_live.removeClass("text-color");
                    player_status.css("left", 55);
                    myPlayer.setDataSource(
                        {type: "application/x-mpegURL", src: channel_info.hls_pull_url},
                        {type: "video/x-flv", src: channel_info.http_pull_url},
                        {type: "video/mp4", src: channel_info.rtmp_pull_url}
                    );
                    myPlayer.play();
                    //关闭
                    stop_live.one("click", function () {
                        $(this).addClass("text-color");
                        start_live.removeClass("text-color");
                        player_status.css("left", 4);
                        myPlayer.release();
                    });
                }
            });

        },

        //获取聊天室信息
        talkContent: function () {
            //加载实时聊天信息
            var xmlhttp,
                xmlDoc,
                wsUrl,
                secondTime,
                socket, html;
            if (window.XMLHttpRequest) {
                xmlhttp = new XMLHttpRequest();
            } else {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            }
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    xmlDoc = xmlhttp.responseXML;
                    wsUrl = xmlDoc.getElementsByTagName("websocketUrl")[0].childNodes[0].nodeValue;
                    secondTime = Number(xmlDoc.getElementsByTagName("setTime")[0].childNodes[0].nodeValue);
                    if (typeof (WebSocket) == "undefined") {
                        alert("您的浏览器不支持WebSocket");
                        return;
                    }
                    socket = new WebSocket(wsUrl + token);
                    onlineCount();
                    socket.onmessage = function (msg) {
                        var content = JSON.parse(msg.data);
                        var body = JSON.parse(content.body);
                        var array = ["text-white", "text-purple", "text-green", "text-blue", "text-red"];
                        var color_status = array[Math.floor(Math.random() * 5)];
                        html = '<div class="user-talk">\n' +
                            '    <span class="name">' + content.from_name + '</span>\n' +
                            '    <span class="comment ' + color_status + ' ">' + body.msg + '</span>\n' +
                            '</div>'
                        talk_list.append(html);
                        scrollbar();
                    };
                    socket.onclose = function () {
                        //关闭
                    };
                }
            };
            xmlhttp.open("GET", "/static/js/xmlfile.xml", false);
            xmlhttp.send();

            //点击发送消息
            send_btn.on('click', function (e) {
                e.preventDefault();
                var chat_msg = msg_input[0].value.trim();
                var countdown = $("#countdown");
                if (msgVaild(chat_msg)) {
                    socket.send(JSON.stringify({
                        'user_id': user_id,
                        'username': username,
                        'body': {
                            'msg': chat_msg,
                        },
                        'token': token
                    }));
                    msg_input[0].value = "";
                    send_btn.addClass("hidden");
                    countdown.removeClass("hidden");
                    var i = Number(secondTime - 1);
                    var setTime = setInterval(function () {
                        if (i >= 0) {
                            countdown.text(i + "s");
                            i--;
                        } else {
                            clearInterval(setTime);
                        }
                    }, 1000);
                    setTimeout(function () {
                        countdown.addClass("hidden").text("3s");
                        send_btn.removeClass("hidden");
                    }, 4000);
                } else {
                    console.log("不能为空！");
                }
            });

            //点击遮罩层
            mask.on('click', function () {
                closePOP();
            });

            //点击确定
            popover_btn.on('click', function () {
                closePOP();
            });
        },


        //滚动到最底部
        // scrollTop: function () {
        //     var scrollfn = setInterval(function () {
        //         scrollbar();
        //     }, 1000)
        //     talk_list.scroll(function () {
        //         scrollbar()
        //         clearInterval(scrollfn);
        //     });
        // },

    };
})()


client.setPlay();
client.talkContent();
// client.scrollTop();