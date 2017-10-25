var phostess = (function () {
    var talk_list = $("#talk-list");
    var channel_token = GetQueryString("channel_token");
    var user_id = GetQueryString("user_id");

    function GetQueryString(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null)return unescape(r[2]);
        return null;
    }

    //滚动条位置
    function scrollbar() {
        var height = parseFloat(talk_list.height());//div高度
        var scrollTop = parseFloat(talk_list[0].scrollTop);//滚动条的高度
        var scrollHeight = parseFloat(talk_list[0].scrollHeight);//滚动条需要滚动的高度
        if (height + scrollTop < scrollHeight) {
            talk_list.scrollTop(scrollHeight);
        }
    }

    //禁言提示
    function msgTip(_this, txt) {
        _this.append("<span class=\"msg-success\"><button type=\"button\" class=\"msg-btn\">" + txt + "</button></span>");
        setTimeout(function () {
            _this.find(".msg-success").remove();
        }, 1000);
    }

    return {
        talkContent: function () {
            //加载实时聊天信息
            var xmlhttp,
                xmlDoc,
                wsUrl,
                status,
                socket,
                statusSocket,
                html;
            if (window.XMLHttpRequest) {
                xmlhttp = new XMLHttpRequest();
            } else {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            }
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    xmlDoc = xmlhttp.responseXML;
                    wsUrl = xmlDoc.getElementsByTagName("websocketUrl")[0].childNodes[0].nodeValue;
                    status = xmlDoc.getElementsByTagName("hostessStatus")[0].childNodes[0].nodeValue;
                    if (typeof (WebSocket) == "undefined") {
                        alert("您的浏览器不支持WebSocket");
                        return;
                    }
                    socket = new WebSocket(wsUrl + channel_token);
                    statusSocket = new WebSocket(status + channel_token);
                    socket.onmessage = function (msg) {
                        var content = JSON.parse(msg.data);
                        var body = JSON.parse(content.body);
                        var array = ["text-white", "text-purple", "text-green", "text-blue", "text-red"];
                        var color_status = array[Math.floor(Math.random() * 5)];
                        html = '<div class="user-talk" data-pid="' + content.from_accid + '">\n' +
                            '    <span class="name">' + content.from_name + '</span>\n' +
                            '    <span class="comment ' + color_status + ' ">' + body.msg + '</span>\n' +
                            '    <span class="opt-btn">\n' +
                            '       <button type="button" class="btn-xs stop-say">禁言</button>\n' +
                            '    </span>\n' +
                            '</div>';
                        talk_list.append(html);
                        scrollbar();
                    };
                }
            };
            xmlhttp.open("GET", "/static/js/xmlfile.xml", false);
            xmlhttp.send();

            $(document).on("click", ".stop-say", function () {
                var _this = $(this);
                if (!_this.hasClass("disabled")) {
                    var _this_p = $(this).parents(".user-talk");
                    var people_id = _this_p.data("pid");
                    var people_name = _this_p.find(".name").text();
                    $.ajax({
                        url: "/v1/data/anchor/add_black_list/" + user_id,
                        type: "post",
                        data: {"send_id": people_id, "send_name": people_name},
                        dataType: "json",
                        success: function (data) {
                            if (data.code == 200) {
                                $.each($(".user-talk"), function (index, item) {
                                    if ($(item).attr("data-pid") == people_id) {
                                        $(item).find(".stop-say").addClass("disabled");
                                    }
                                });
                                msgTip(_this_p, "禁言成功!");
                            } else {
                                msgTip(_this_p, "操作失败!");
                            }
                        }

                    });
                }
            });
        }
    }
})()

phostess.talkContent();