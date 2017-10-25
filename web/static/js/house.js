var housemanagement = (function () {
    var add_house = $('#add-house'),
        delAll_btn = $('.delAll-btn'),
        h_msg = $(".header-l .msg"),
        house_popover = $("#house-popover"),
        hostessMg_popover = $("#hostessMg-popover"),
        mask = $(".ui-mask"),
        popover = $('.popover'),
        all_num = $(".check-all-num"),
        page_current = $(".page-index"),
        page_total = $(".page-total"),
        show_num = $(".pagination .show-num"),
        pagesize = $(".show-num .pagesize"),
        page_first = $(".page-first"),
        page_prev = $(".page-prev"),
        page_next = $(".page-next"),
        page_last = $(".page-last"),
        search_btn = $(".search-btn")
    ;

    var user_id = $('input[name=user_id]').val();


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
        popover.fadeOut();
        popover.find('input').val("");
    }

    //加载html
    function loadHtml(data) {
        var html;
        $.each(data.data, function (index, item) {
            html += '<tr data-channelid="' + item.id + '">\n' +
                '    <td class="d-check">\n' +
                '        <div class="checkbox">\n' +
                '            <input type="checkbox" class="select-house">\n' +
                '        </div>\n' +
                '    </td>\n' +
                '    <td class="d-house">' + item.channel_name + '</td>';
            if (item.status === "0") {
                html += '<td class="d-status">空闲</td>';
            } else if (item.status === "1") {
                html += '<td class="d-status living">直播中</td>';
            } else {
                html += '<td class="d-status freezing">冻结</td>';
            }
            html += ' <td class="d-user">' + item.username + '</td>\n' +
                '    <td class="d-time">' + item.created_at + '</td>\n' +
                '    <td class="d-description">' + item.description + '</td>\n' +
                '    <td class="d-opt">\n' +
                '        <div>';
            if (item.status === "0" || item.status === "1") {
                html += '<button type="button" class="btn-xs freeze-btn">冻结</button>';
            } else {
                html += '<button type="button" class="btn-xs unfreeze">解冻</button>';
            }
            html += ' <button type="button" class="btn-xs hmg-btn">主播管理</button>\n' +
                ' <button type="button" class="btn-xs del-btn">删除</button>\n' +
                '        </div>\n' +
                '    </td>\n' +
                '</tr>';
        });
        $('.table tbody').html(html);
    }

    //删除房间
    function delHouse(channelid, _this) {
        $.ajax({
            url: "/v1/data/channel/del_channel/" + user_id,
            type: "post",
            data: {"channel_id": channelid},
            dataType: "json",
            success: function (data) {
                if (data.code === "200") {
                    _this.remove();
                    tip("error", "删除成功!");
                } else {
                    console.log(data.msg);
                }
            }
        });
    }

    //ajax加载房间列表
    function houseAjax(channel_name, page_index, page_size) {
        $.ajax({
            url: "/v1/data/channel/get_channel_list/" + user_id,
            type: "post",
            data: {
                "channel_name": channel_name,
                "page_index": page_index,
                "page_size": page_size
            },
            dataType: "json",
            success: function (data) {
                page_first.removeClass("disabled");
                page_prev.removeClass("disabled");
                page_next.removeClass("disabled");
                page_last.removeClass("disabled");
                if (data.code === "200") {
                    if (data.data.total_count > 0) {
                        loadHtml(data.data);
                        all_num.text(data.data.total_count);//共几项
                        pagesize.text(data.data.page_size);//每行显示行
                        var current = Number(data.data.page_index);//当前第几页
                        var total = Number(data.data.total_page);//共几页
                        page_current.text(current);
                        page_total.text(total);
                        //按钮状态
                        if (current === 1 && total === 1) {
                            page_first.addClass("disabled");
                            page_prev.addClass("disabled");
                            page_next.addClass("disabled");
                            page_last.addClass("disabled");
                        } else if (current === total) {
                            page_next.addClass("disabled");
                            page_last.addClass("disabled");
                        } else if (current === 1 && current < total) {
                            page_first.addClass("disabled");
                            page_prev.addClass("disabled");
                        }
                    } else {
                        $('.table tbody').html("");
                        all_num.text(0);//共几项
                        pagesize.text(10);//每行显示行
                        page_current.text(data.data.page_index);//当前第几页
                        page_total.text(data.data.total_page);//共几页
                        page_first.addClass("disabled");
                        page_prev.addClass("disabled");
                        page_next.addClass("disabled");
                        page_last.addClass("disabled");
                    }
                } else {
                    console.log(data.msg);
                }
            }
        });
    }

    //提示信息
    function tip(status, msg) {
        h_msg.append("<p class=\"msg-" + status + "\">" + msg + "</p>");
        var tipDom = ".msg-" + status;
        setTimeout(function () {
            $(tipDom).remove();
        }, 3000);
    }

    //验证信息
    function validInfo(channel_name, username, password, passwordAgain, description) {
        $("#form-house").find(".has-error").removeClass("has-error");
        $("#form-house").find(".msg-error").remove();

        if (!/^([A-Za-z0-9\u4e00-\u9fa5])+$/.test(channel_name)) {
            $("input[name='new_channel']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>请输入0-10位中文、英文、数字</p></div>");
            return false;
        } else if (!/^([A-Za-z0-9\u4e00-\u9fa5])+$/.test(username)) {
            $("input[name='new_hostess']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>请输入0-8位中文、英文、数字</p></div>");
            return false;
        } else if (!/^[0-9A-Za-z]+$/.test(password) || password.length < 6 || password.length > 20) {
            $("input[name='new_password']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>请输入6-20位的数字或字母!</p></div>");
            return false;
        } else if (password !== passwordAgain) {
            $("input[name='again_password']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>密码不一致!</p></div>");
            return false;
        } else if (description === "" || description == undefined) {
            $("textarea[name='new_description']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>房间描述不能为空!</p></div>");
            return false;
        } else {
            return true;
        }
    }

    //更新
    function updateValid(username, password, password_again) {
        $("#form-hostess").find(".has-error").removeClass("has-error");
        $("#form-hostess").find(".msg-error").remove();

        if (!/^([A-Za-z0-9\u4e00-\u9fa5])+$/.test(username)) {
            $("input[name='hostess-name']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>请输入0-8位中文、英文、数字</p></div>");
            return false;
        } else if (!/^[0-9A-Za-z]+$/.test(password) || password.length < 6 || password.length > 20) {
            $("input[name='hostess-password']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>请输入6-20位的数字或字母!</p></div>");
            return false;
        } else if (password !== password_again) {
            $("input[name='hostess-password-again']").parent().addClass("has-error").append("<div class=\"msg-error\"><p>密码不一致!</p></div>");
            return false;
        } else {
            return true;
        }
    }

    function openVoiceAccount(userId) {
        $.ajax({
            url: '/v1/data/user/open_user_voice/' + userId,
            type: 'post',
            data: {},
            success: function (data) {
                if (data == 200) {
                    console.log(data.msg)
                } else {
                    console.log(data.msg)
                }
            }
        })
    }


    return {
        //加载管理员信息
        loadadmin: function () {
            var due_time = $(".info-body .due-time");
            var app_key = $(".info-body .app-key");
            var bandwidth = $(".info-body .bandwidth");
            var app_token = $(".info-body .app-token");
            $.ajax({
                url: "/v1/data/user/get_user_info/" + user_id,
                type: "post",
                data: {},
                success: function (data) {
                    if (data.code === "200") {
                        due_time.text(data.data.due_time);
                        app_key.text(data.data.app_key);
                        // bandwidth.text(data.data.bandwidth);
                        app_token.text(data.data.app_token);
                    } else if (data.code === "300") {
                        openVoiceAccount(user_id);
                    }
                }
            });
        },

        //加载公共信息
        loadPublic: function () {
            var p_username = $(".topbar-right .p_username");
            var p_remaining_amount = $(".topbar-right .remaining-amount");
            $.ajax({
                url: "/v1/data/user/get_public_user_info/" + user_id,
                type: "post",
                data: {},
                success: function (data) {
                    if (data.code === "200") {
                        p_username.text(data.data.data.username);
                        p_remaining_amount.text(data.data.data.money);
                    } else {
                        console.log("未获取到信息！");
                    }
                }
            });
        },

        //加载房间列表
        loadhouse: function () {
            houseAjax("", 1, 10);
        },
        //操作
        optHouse: function () {
            //添加房间
            var sure_house = $(".sure-add-house");
            sure_house.on('click', function () {
                var channel_name = $("input[name='new_channel']").val().trim();
                var username = $("input[name='new_hostess']").val().trim();
                var password = $("input[name='new_password']").val().trim();
                var passwordAgain = $("input[name='again_password']").val().trim();
                var description = $("textarea[name='new_description']").val().trim();
                if (validInfo(channel_name, username, password, passwordAgain, description)) {
                    $.ajax({
                        url: "/v1/data/channel/create_channel/" + user_id,
                        type: "post",
                        data: {
                            "channel_name": channel_name,
                            "username": username,
                            "password": password,
                            "description": description
                        },
                        dataType: "json",
                        success: function (data) {
                            if (data.code === "200") {
                                popClose();
                                tip("success", "创建成功！");
                                houseAjax("", 1, 10);
                            } else {
                                popClose();
                                tip("error", data.msg);
                            }
                        }
                    });
                }
            });

            //删除房间
            $(".table").on("click", ".del-btn", function () {
                var _this = $(this).parents("tr")
                var channelid = _this.data("channelid");
                if (confirm("确定删除？")) {
                    delHouse(channelid, _this);
                }
            });

            //冻结房间
            $(".table").on("click", ".freeze-btn", function () {
                var _this = $(this).parents("tr")
                var channelid = _this.data("channelid");
                $.ajax({
                    url: "/v1/data/channel/frozen_channel/" + user_id,
                    type: "post",
                    data: {"channel_id": channelid, "ope": 2},
                    dataType: "json",
                    success: function (data) {
                        if (data.code === "200") {
                            _this.find(".d-status").html("冻结").addClass("freezing");
                            _this.find(".freeze-btn").addClass("unfreeze").removeClass("freeze-btn").html("解冻");
                            tip("error", "冻结成功！");
                        } else {
                            console.log(data.msg);
                        }
                    }
                });
            });

            //解冻房间
            $(".table").on("click", ".unfreeze", function () {
                var _this = $(this).parents("tr")
                var channelid = _this.data("channelid");
                $.ajax({
                    url: "/v1/data/channel/frozen_channel/" + user_id,
                    type: "post",
                    data: {"channel_id": channelid, "ope": 0},
                    dataType: "json",
                    success: function (data) {
                        if (data.code === "200") {
                            _this.find(".d-status").html("空闲").removeClass("freezing");
                            _this.find(".unfreeze").addClass("freeze-btn").removeClass("unfreeze").html("冻结");
                            tip("success", "解冻成功！");
                        } else {
                            console.log(data.msg);
                        }
                    }
                });
            });

            var check_num = $(".check-num"),//已选项
                selectAll_house = $(".selectAll-house");//全选
            //选择
            $(".table").on("click", ".select-house", function () {
                var len = $(".select-house").length;
                var len_checked = $(".select-house:checked").length;
                check_num.text(len_checked);
                if (len === len_checked) {
                    selectAll_house.prop("checked", true);
                } else {
                    selectAll_house.prop("checked", false);
                }
            });

            //全选
            selectAll_house.on("click", function () {
                $(".select-house").prop("checked", $(this).prop("checked"));
                var len_checked = $(".select-house:checked").length;
                check_num.text(len_checked);
            });

            //选择删除
            delAll_btn.on("click", function () {
                var arr = $(".select-house:checked");
                if (arr.length > 0) {
                    $.each(arr, function (index, item) {
                        var channelid = $(item).parents("tr").data("channelid");
                        var _this = $(this).parents("tr")
                        delHouse(channelid, _this, h_msg);
                    });
                } else {
                    alert("请选择要删除的房间！")
                }
            });

            //搜索房间
            search_btn.on("click", function (e) {
                e.preventDefault();
                var val = $("input[name='search-house']").val().trim();
                if (val != "" && val != null) {
                    houseAjax(val, 1, 10);
                } else {
                    alert("房间名不能为空！")
                }
            });

            //分页-下一页
            page_next.on("click", function () {
                if (!$(this).hasClass("disabled")) {
                    var index = Number(page_current.text());
                    var nextNum = Number(index + 1);
                    var total = Number(page_total.text());
                    var size = Number(pagesize.text());
                    houseAjax("", nextNum, size);
                    page_first.removeClass("disabled");
                    page_prev.removeClass("disabled");
                    if (nextNum === total) {
                        page_next.addClass("disabled");
                        page_last.addClass("disabled");
                    }
                }
            });
            //分页-最后一页
            page_last.on("click", function () {
                if (!$(this).hasClass("disabled")) {
                    var total = Number(page_total.text());
                    var size = Number(pagesize.text());
                    houseAjax("", total, size);
                    page_first.removeClass("disabled");
                    page_prev.removeClass("disabled");
                    page_next.addClass("disabled");
                    page_last.addClass("disabled");
                }
            });
            //分页-上一页
            page_prev.on("click", function () {
                if (!$(this).hasClass("disabled")) {
                    var index = Number(page_current.text());
                    var prevNum = Number(index - 1);
                    var size = Number(pagesize.text());
                    houseAjax("", prevNum, size);
                    page_next.removeClass("disabled");
                    page_last.removeClass("disabled");
                    if (prevNum === 1) {
                        page_first.addClass("disabled");
                        page_prev.addClass("disabled");
                    }
                }
            });
            //分页-第一页
            page_first.on("click", function () {
                if (!$(this).hasClass("disabled")) {
                    var size = Number(pagesize.text());
                    houseAjax("", 1, size);
                    page_first.addClass("disabled");
                    page_prev.addClass("disabled");
                    page_next.removeClass("disabled");
                    page_last.removeClass("disabled");
                }
            });

        },
        //弹出层显示
        popoverShow: function () {
            var popover_close = $('.popover-close'),
                cancel_add = $('.cancel-add');

            //添加房间-弹出框
            add_house.on('click', function () {
                house_popover.fadeIn();
                center(house_popover);
                mask.fadeIn();
                $(window).resize(function () {
                    center(house_popover);
                });
                $(document).scroll(function () {
                    center(house_popover);
                });
            });

            //主播管理-弹出框
            $('.table').on('click', '.hmg-btn', function () {
                var channelid = $(this).parents('tr').data("channelid");
                hostessMg_popover.find("input[name='channelid']").val(channelid);
                hostessMg_popover.fadeIn();
                center(hostessMg_popover);
                mask.fadeIn();
                $(window).resize(function () {
                    center(hostessMg_popover);
                });
                $(document).scroll(function () {
                    center(hostessMg_popover);
                });
            });

            //关闭按钮
            popover_close.on('click', function () {
                popClose();
            });
            //取消
            cancel_add.on('click', function () {
                popClose();
            });
            //遮罩层
            mask.on('click', function () {
                popClose();
            });
        },

        //每页显示行操作
        optPage: function () {
            //页面显示数量
            show_num.hover(function () {
                $(this).find(".tip-con").show();
            }, function () {
                $(this).find(".tip-con").hide();
            });

            show_num.find("li").click(function () {
                var val = $("input[name='search-house']").val().trim();
                var size = Number($(this).data("pagesize"));
                houseAjax(val, 1, size);
                show_num.find(".pagesize").text(size);
            });

        },

        //主播管理
        hostess: function () {
            //主播管理-弹出框
            $('.table').on('click', '.hmg-btn', function () {
                var _this = $(this).parents('tr');
                var channel_id = _this.data("channelid");
                hostessMg_popover.fadeIn();
                center(hostessMg_popover);
                mask.fadeIn();
                $(window).resize(function () {
                    center(hostessMg_popover);
                });
                $(document).scroll(function () {
                    center(hostessMg_popover);
                });


                //确认修改
                $(".popover").on("click", ".sure-update-hostess", function () {
                    var username = $("input[name='hostess-name']").val().trim();
                    var password = $("input[name='hostess-password']").val().trim();
                    var password_again = $("input[name='hostess-password-again']").val().trim();

                    if (updateValid(username, password, password_again)) {
                        $.ajax({
                            url: "/v1/data/channel/edit_channel_info/" + user_id,
                            type: "post",
                            data: {
                                "channel_id": channel_id,
                                "username": username,
                                "password": password
                            },
                            dataType: "json",
                            success: function (data) {
                                if (data.code === "200") {
                                    _this.find(".d-user").text(username);
                                    popClose();
                                    tip("success", "修改成功！");
                                    // h_msg.append("<p class=\"msg-success\">修改成功!</p>");
                                    // setTimeout(function () {
                                    //     $('.msg-success').remove();
                                    // }, 3000);
                                } else {
                                    popClose();
                                    tip("error", data.msg);
                                }
                            }
                        });
                    }
                });
            });
        },

        //tab页面
        tabPage: function () {
            var menu_li = $(".menu .menu-li");
            var tab_page = $(".tab-page")
            menu_li.on("click", function () {
                if (!$(this).hasClass("current")) {
                    menu_li.removeClass("current");
                    $(this).addClass("current");
                    var str = $(this).attr("data-page");
                    tab_page.hide();
                    $("." + str).show();
                }
            });
        },

        //top导航
        dropdownShow: function () {
            $(".cost-dropdown").hover(function () {
                $(this).addClass("current");
            }, function () {
                $(this).removeClass("current");
            });

            $(".user-dropdown").hover(function () {
                $(this).addClass("current");
            }, function () {
                $(this).removeClass("current");
            });
            //退出
            $(".admin-esc").click(function () {
                window.location.replace("/v1/view/login.html");
            });
        }
    };
})();
housemanagement.loadadmin();
housemanagement.loadPublic();
housemanagement.loadhouse();
housemanagement.optHouse();
housemanagement.popoverShow();
housemanagement.optPage();
housemanagement.hostess();
housemanagement.tabPage();
housemanagement.dropdownShow();