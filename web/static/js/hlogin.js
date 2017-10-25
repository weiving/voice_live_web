function login() {
    var username = $("input[name='hostess-name']").val().trim();
    var password = $("input[name='hostess-password']").val().trim();

    function validmsg() {
        if (username.length === 0) {
            $(".login-body .msg").text("请输入用户名!");
            return false;
        } else if (password.length === 0) {
            $(".login-body .msg").text("请输入密码!");
        } else {
            return true;
        }
    }

    if (validmsg()) {
        $.ajax({
            type: "post",
            url: "/v1/data/anchor/login",
            data: {
                "username": username,
                "password": password
            },
            success: function (data) {
                if (data.code == 200) {
                    window.location.replace("/v1/view/anchor/hostess.html")
                } else {
                    console.log(data.msg);
                }
            }
        });
    }
}

$(document).keydown(function (event) {
    if (event.keyCode == 13) {
        $("#hostess-login").click();
    }
})

$("#hostess-login").click(function () {
    login();
})

$("#cancel-login").click(function () {
    $("input[name='hostess-name']").val("");
    $("input[name='hostess-password']").val("");
})