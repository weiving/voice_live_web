var hostess = (function () {
    var hostess_name = $(".player-header .user-name"),
        hostess_img = $(".user-img img"),
        filename = $("#img-filename"),
        online_total = $(".player-header .total"),
        hostess_esc = $(".userClose img"),
        start_live = $('#start-live'),
        close_live = $('#close-live'),
        player_icon = $('.player-icon .iconfont'),//话筒
        player_status = $('.player-status'),//直播中
        header_popover = $("#header-popover"),
        //header_popover_close = $("#header-popover .popover-close"),
        blacklist = $('#blacklist'),
        black_popover = $('#blackList-popover'),
        // black_popover_close = $("#blackList-popover .popover-close"),
        mask = $(".ui-mask"),
        commentsList = $('#commentsList')
    ;

    // var audioCtx;
    // try {
    //     audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // }
    // catch (e) {
    //     console.log("Your browser does not support AudioContext!");
    // }
    // navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
    // navigator.mozGetUserMedia || navigator.msGetUserMedia);
    // if (navigator.getUserMedia) {
    //     navigator.getUserMedia(
    //         {
    //             audio: true
    //         },
    //         function (stream) {
    //             var source = audioCtx.createMediaStreamSource(stream);
    //             var biquadFilter = audioCtx.createBiquadFilter();
    //             biquadFilter.type = "lowshelf";
    //             biquadFilter.frequency.value = 1000;
    //             biquadFilter.gain.value = 25;
    //             source.connect(biquadFilter);
    //             biquadFilter.connect(audioCtx.destination);
    //
    //             // var audioInput = audioCtx.createMediaStreamSource(stream);
    //             // audioInput.connect(audioCtx.destination);
    //             var aaa = stream.getAudioTracks();
    //
    //         },
    //         function (err) {
    //             console.log("The following gUM error occured: " + err);
    //         });
    // }
    // else {
    //     console.log("getUserMedia not supported on your browser!");
    // }

    // MediaStreamTrack.getSources(function (sourceInfos) {
    //     var audioSource = null;
    //     var videoSource = null;
    //
    //     for (var i = 0; i != sourceInfos.length; ++i) {
    //         var sourceInfo = sourceInfos[i];
    //         if (sourceInfo.kind === 'audio') {
    //             console.log(sourceInfo.id, sourceInfo.label || 'microphone');
    //
    //             audioSource = sourceInfo.id;
    //         } else if (sourceInfo.kind === 'video') {
    //             console.log(sourceInfo.id, sourceInfo.label || 'camera');
    //
    //             videoSource = sourceInfo.id;
    //         } else {
    //             console.log('Some other kind of source: ', sourceInfo);
    //         }
    //     }
    //
    //     sourceSelected(audioSource, videoSource);
    // });
    // function sourceSelected(audioSource, videoSource) {
    //     var constraints = {
    //         audio: {
    //             optional: [{sourceId: audioSource}]
    //         },
    //         video: {
    //             optional: [{sourceId: videoSource}]
    //         }
    //     };
    //     navigator.getUserMedia(constraints, onSuccess, onError);
    // }

    //直播初始化
    var viewOptions = {
        videoWidth: 640,    // Number 可选 推流分辨率 宽度 default 640
        videoHeight: 480,   // Number 可选 推流分辨率 高度 default 480
        fps: 15,            // Number 可选 推流帧率 default 15
        bitrate: 600,       // Number 可选 推流码率 default 600
        video: false,       // Boolean 可选 是否推流视频 default true
        audio: true       // Boolean 可选 是否推流音频 default true
    }
    var microPhoneList,
        cameraList,
        microPhoneOptions = '',
        cameraOptions = '',
        channel_info;
    var user_id = $("input[name='hostess-loginid']").val();
    var channel_token = $("input[name='channel_token']").val();
    $.ajax({
        type: "post",
        url: "/v1/data/anchor/get_channel_info/" + user_id,
        data: {},
        success: function (data) {
            if (data.code === "200") {
                channel_info = data.data;
                hostess_name.text(channel_info.username);
                hostess_img.attr("src", channel_info.image_url);
            } else {
                channel_info = {};
            }
        }
    });
    //在线人数
    var onlineCount = function () {
        $.ajax({
            url: "/v1/data/anchor/get_online_count/" + user_id,
            type: "post",
            data: {},
            success: function (data) {
                if (data.code === "200") {
                    online_total.text(data.data);
                } else {
                    console.log("获取人数失败!");
                }
            }
        });
    };
    setInterval(onlineCount, 30000);

    function initPublisher() {
        window.publisher = new window.nePublisher('my-publisher', {
            videoWidth: 640,
            videoHeight: 480,
            fps: 20,
            bitrate: 1500
        }, {
            previewWindowWidth: 214,// Number 可选 预览窗口宽度 default 862
            previewWindowHeight: 137,// Number 可选 预览窗口高度 default 446
            wmode: 'transparent',// String 可选 flash显示模式 default transparent
            quality: 'high',// String 可选 flash质量
            allowScriptAccess: 'always'// String 可选 flash跨域允许
        }, function () {
            //该回调中调用getCameraList和getMicroPhoneList方法获取 摄像头和麦克风列表
            cameraList = window.publisher.getCameraList();
            microPhoneList = window.publisher.getMicroPhoneList();
            for (var i = cameraList.length - 1; i >= 0; i--) {
                cameraOptions = '<option value="' + i + '">' + cameraList[i] + '</option>' + cameraOptions;
            }
            for (var i = microPhoneList.length - 1; i >= 0; i--) {
                microPhoneOptions = '<option value="' + i + '">' + microPhoneList[i] + '</option>' + microPhoneOptions;
            }
            document.getElementById("cameraSelect").innerHTML = cameraOptions;
            document.getElementById("microPhoneSelect").innerHTML = microPhoneOptions;
        }, function (code, desc) {
            console.log(code, desc);
        });
    }

    window.navigator.getMedia = (window.navigator.getUserMedia || window.navigator.webkitGetUserMedia ||
    window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia);
    if (window.navigator.getMedia) {
        // initPublisher();
        window.navigator.getMedia(
            {
                audio: true
            },
            function () {
                window.mediaFlag = true;
                initPublisher();
            },
            function (err) {
                console.log("The following gUM error occured: " + err);
            });
    }
    else {
        console.log("getUserMedia not supported on your browser!");
    }

    var getCameraIndex = function () {
        var cameraSelect = document.getElementById("cameraSelect");
        var cameraIndex = cameraSelect.selectedIndex;
        return cameraSelect.options[cameraIndex].value;
    };
    var getMicroPhoneIndex = function () {
        var microPhoneSelect = document.getElementById("microPhoneSelect");
        var microPhoneIndex = microPhoneSelect.selectedIndex;
        return microPhoneSelect.options[microPhoneIndex].value;
    };
    //开始直播
    var startPublish = function () {
        var publishUrl = channel_info.push_url;
        var channel_id = channel_info.id;
        $.ajax({
            url: "/v1/data/anchor/start_live/" + channel_id,
            type: "post",
            data: {},
            dataType: "json",
            success: function (data) {
                if (data.code === "200") {
                    window.publisher.setCamera(getCameraIndex());
                    window.publisher.setMicroPhone(getMicroPhoneIndex());
                    window.publisher.startPublish(publishUrl, viewOptions, function (code, desc) {
                        console.log(code, desc);
                    });
                }
            }
        });
    }
    //停止推流
    var stopPublish = function () {
        window.publisher.stopPublish();
    };


    // var myPublisher = new nePublisher('my-publisher', {
    //     videoWidth: 640,
    //     videoHeight: 480,
    //     fps: 20,
    //     bitrate: 1500
    // }, {
    //     previewWindowWidth: 214,// Number 可选 预览窗口宽度 default 862
    //     previewWindowHeight: 137,// Number 可选 预览窗口高度 default 446
    //     wmode: 'transparent',// String 可选 flash显示模式 default transparent
    //     quality: 'high',// String 可选 flash质量
    //     allowScriptAccess: 'always'// String 可选 flash跨域允许
    // }, function () {
    //     //该回调中调用getCameraList和getMicroPhoneList方法获取摄像头和麦克风列表
    //     cameraList = this.myPublisher.getCameraList();
    //     microPhoneList = this.myPublisher.getMicroPhoneList();
    //     for (var i = cameraList.length - 1; i >= 0; i--) {
    //         cameraOptions = '<option value="' + i + '">' + cameraList[i] + '</option>' + cameraOptions;
    //     }
    //     for (var i = microPhoneList.length - 1; i >= 0; i--) {
    //         microPhoneOptions = '<option value="' + i + '">' + microPhoneList[i] + '</option>' + microPhoneOptions;
    //     }
    //     document.getElementById("cameraSelect").innerHTML = cameraOptions;
    //     document.getElementById("microPhoneSelect").innerHTML = microPhoneOptions;
    // }, function (code, desc) {
    //     console.log(code, desc);
    // });
    // var getCameraIndex = function () {
    //     var cameraSelect = document.getElementById("cameraSelect");
    //     var cameraIndex = cameraSelect.selectedIndex;
    //     return cameraSelect.options[cameraIndex].value;
    // };
    // var getMicroPhoneIndex = function () {
    //     var microPhoneSelect = document.getElementById("microPhoneSelect");
    //     var microPhoneIndex = microPhoneSelect.selectedIndex;
    //     return microPhoneSelect.options[microPhoneIndex].value;
    // };
    // var startPublish = function () {
    //     var publishUrl = channel_info.push_url;
    //     var channel_id = channel_info.id;
    //     console.log(channel_info.push_url);
    //     $.ajax({
    //         url: "/v1/data/anchor/start_live/" + channel_id,
    //         type: "post",
    //         data: {},
    //         dataType: "json",
    //         success: function (data) {
    //             if (data.code === "200") {
    //                 myPublisher.setCamera(getCameraIndex());
    //                 myPublisher.setMicroPhone(getMicroPhoneIndex());
    //                 myPublisher.startPublish(publishUrl, viewOptions, function (code, desc) {
    //                     console.log(code, desc);
    //                 });
    //             }
    //         }
    //     });
    // }
    // //停止推流
    // var stopPublish = function () {
    //     myPublisher.stopPublish();
    // };


    //居中
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

    //弹窗关闭
    function popClose() {
        mask.fadeOut();
        $(".popover").fadeOut();
        //black_popover.fadeOut();
        // black_popover.find('input').val("");
    }

    //禁言提示
    function msgTip(_this, txt) {
        _this.append("<span class=\"msg-success\">" + txt + "</span>");
        setTimeout(function () {
            _this.find(".msg-success").remove();
        }, 1000);
    }

    //滚动条位置
    function scrollbar() {
        var height = parseFloat(commentsList.height());
        var scrollTop = parseFloat(commentsList[0].scrollTop);
        var scrollHeight = parseFloat(commentsList[0].scrollHeight);
        if (height + scrollTop < scrollHeight) {
            commentsList.scrollTop(scrollHeight);
        }
    }

    return {
        //获取聊天室信息
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
                    onlineCount();
                    socket.onmessage = function (msg) {
                        var content = JSON.parse(msg.data);
                        var body = JSON.parse(content.body);
                        html = '<div class="talk-about" data-pid="' + content.from_accid + '">\n' +
                            '    <span class="username">' + content.from_name + '</span>：\n' +
                            '    <span class="talk-text">' + body.msg + '</span>\n' +
                            '    <span class="opt-btn">\n' +
                            '        <button type="button" class="btn-xs stop-say">禁言</button>\n' +
                            '    </span>\n' +
                            '</div>';
                        commentsList.append(html);
                        scrollbar();
                    };
                }
            };
            xmlhttp.open("GET", "/static/js/xmlfile.xml", false);
            xmlhttp.send();

            //禁言
            $(document).on("click", ".stop-say", function () {
                var _this = $(this);
                if (!_this.hasClass("disabled")) {
                    var _this_p = $(this).parents(".talk-about");
                    var people_id = _this_p.data("pid");
                    var people_name = _this_p.find(".username").text();
                    $.ajax({
                        url: "/v1/data/anchor/add_black_list/" + user_id,
                        type: "post",
                        data: {"send_id": people_id, "send_name": people_name},
                        dataType: "json",
                        success: function (data) {
                            if (data.code == 200) {
                                $.each($(".talk-about"), function (index, item) {
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

            //解禁
            $(document).on("click", ".open-say", function () {
                var _this = $(this).parents(".black");
                var _this_h = black_popover.find(".popover-header");
                var open_id = _this.attr("data-pid");
                $.ajax({
                    url: "/v1/data/anchor/relieve_black/" + user_id,
                    type: "post",
                    data: {"send_id": open_id},
                    dataType: "json",
                    success: function (data) {
                        if (data.code == 200) {
                            _this.remove();
                            msgTip(_this_h, "解禁成功!");
                        } else {
                            msgTip(_this_h, "操作失败!");
                        }
                    }
                });
            });

        },

        //滚动条始终在最低端
        scrollbarTop: function () {
            scrollbar
            // var scollfn = setInterval(function () {
            //     scrollbar();
            // }, 1000);
            // commentsList.scroll(function () {
            //     clearInterval(scollfn);
            // });
        },

        //开始直播
        startLive: function () {
            start_live.on('click', function () {
                startPublish();
                $(this).addClass('hidden').next('button').removeClass('hidden');
                player_icon.addClass('blink');
                player_status.html('直播中<span class="dotting"></span>');
                $(".single").show();
            });
        },
        //关闭直播
        closeLive: function () {
            close_live.on('click', function () {
                stopPublish();
                $(this).addClass('hidden').prev('button').removeClass('hidden');
                player_icon.removeClass('blink');
                player_status.html('准备直播');
                $(".single").hide();
            })
        },
        //显示模态框
        popoverShow: function () {
            var popover_close = $('.popover-close');

            //黑名单模态框
            blacklist.on('click', function () {
                $.ajax({
                    url: "/v1/data/anchor/get_black_list/" + user_id,
                    type: "post",
                    data: {},
                    dataType: "json",
                    success: function (data) {
                        if (data.code === "200") {
                            var html = "";
                            if (data.data.length > 0) {
                                $.each(data.data, function (index, item) {
                                    html += '<div class="black" data-pid="' + item.send_id + '">\n' +
                                        '<div class="black-name">' + item.send_name + '</div>\n' +
                                        '<div class="black-time">' + item.created_at + '</div>\n' +
                                        '<div class="black-opt">\n' +
                                        '<button type="button" class="btn-xs open-say">解禁</button>\n' +
                                        '</div>\n' +
                                        '</div>';
                                });
                            } else {
                                html = '<p>目前尚无黑名单！</p>';
                            }
                            black_popover.find(".black-menu").html(html);
                        } else {

                        }
                    }
                });
                black_popover.fadeIn();
                center(black_popover);
                mask.fadeIn();
                $(window).resize(function () {
                    center(black_popover);
                });
                $(document).scroll(function () {
                    center(black_popover);
                });
            });

            //头像
            hostess_img.on("click", function () {
                header_popover.fadeIn();
                center(header_popover);
                mask.fadeIn();
                $(window).resize(function () {
                    center(header_popover);
                });
                $(document).scroll(function () {
                    center(header_popover);
                });
            });

            //关闭按钮
            popover_close.on('click', function () {
                popClose();
            });

            //遮罩层
            mask.on('click', function () {
                popClose();
            });
        },

        //主播退出
        hostessEsc: function () {
            hostess_esc.on("click", function () {
                window.location.replace("/v1/view/hlogin.html");
            });
        }
    };

})();

hostess.talkContent();
hostess.scrollbarTop();
hostess.startLive();
hostess.closeLive();
hostess.popoverShow();
hostess.hostessEsc();
