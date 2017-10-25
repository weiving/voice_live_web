accessid = ''
accesskey = ''
host = ''
policyBase64 = ''
signature = ''
callbackbody = ''
filename = ''
key = ''
expire = 0
g_object_name = ''
g_object_name_type = ''
now = timestamp = Date.parse(new Date()) / 1000;
var user_id = $("input[name='hostess-loginid']").val();

function send_request() {
    var xmlhttp = null;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    else if (window.ActiveXObject) {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    if (xmlhttp != null) {
        // serverUrl = 'http://127.0.0.1:2050/v1/data/anchor/sign_oss/1'
        // xmlhttp.open( "GET", serverUrl, false );
        // xmlhttp.send( null );
        // return xmlhttp.responseText
        // var oss_info;
        $.ajax({
            url: "http://127.0.0.1:2050/v1/data/anchor/sign_oss/1 ",
            type: "post",
            data: {},
            async: false,
            success: function (data) {
                if (data.code === "200") {
                    oss_info = data.data;
                }
            }
        })
        return oss_info;
    }
    else {
        alert("Your browser does not support XMLHTTP.");
    }
};

function check_object_radio() {
    // var tt = document.getElementsByName('myradio');
    // for (var i = 0; i < tt.length; i++) {
    //     if (tt[i].checked) {
    //         g_object_name_type = tt[i].value;
    //         break;
    //     }
    // }
    g_object_name_type = 'local_name';
}

function get_signature() {
    //可以判断当前expire是否超过了当前时间,如果超过了当前时间,就重新取一下.3s 做为缓冲
    now = timestamp = Date.parse(new Date()) / 1000;
    if (expire < now + 3) {
        body = send_request()
        //var obj = eval ("(" + body + ")");
        // host = obj['host']
        // policyBase64 = obj['policy']
        // accessid = obj['accessid']
        // signature = obj['signature']
        // expire = parseInt(obj['expire'])
        // callbackbody = obj['callback']
        // key = obj['dir']
        host = body.host
        policyBase64 = body.policy;
        accessid = body.accessid;
        signature = body.signature;
        expire = parseInt(body.expire);
        callbackbody = body.callback;
        key = body.dir;
        return true;
    }
    return false;
};

function random_string(len) {
    len = len || 32;
    var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    var maxPos = chars.length;
    var pwd = '';
    for (i = 0; i < len; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}

function get_suffix(filename) {
    pos = filename.lastIndexOf('.')
    suffix = ''
    if (pos != -1) {
        suffix = filename.substring(pos)
    }
    return suffix;
}

function calculate_object_name(filename) {
    if (g_object_name_type == 'local_name') {
        g_object_name += "${filename}"
    }
    else if (g_object_name_type == 'random_name') {
        suffix = get_suffix(filename)
        g_object_name = key + random_string(10) + suffix
    }
    return ''
}

function get_uploaded_object_name(filename) {
    if (g_object_name_type == 'local_name') {
        tmp_name = g_object_name
        tmp_name = tmp_name.replace("${filename}", filename);
        return tmp_name
    }
    else if (g_object_name_type == 'random_name') {
        return g_object_name
    }
}

function set_upload_param(up, filename, ret) {
    if (ret == false) {
        ret = get_signature()
    }
    g_object_name = key;
    if (filename != '') {
        suffix = get_suffix(filename)
        calculate_object_name(filename)
    }
    new_multipart_params = {
        'key': g_object_name,
        'policy': policyBase64,
        'OSSAccessKeyId': accessid,
        'success_action_status': '200', //让服务端返回200,不然，默认会返回204
        'callback': callbackbody,
        'signature': signature,
    };

    up.setOption({
        'url': host,
        'multipart_params': new_multipart_params
    });

    up.start();
}

var uploader = new plupload.Uploader({
    runtimes: 'html5,flash,silverlight,html4',
    browse_button: 'selectfiles',
    //multi_selection: false,
    container: document.getElementById('container'),
    flash_swf_url: '/static/ossUpload/plupload-2.1.2/js/Moxie.swf',
    silverlight_xap_url: '/static/ossUpload/plupload-2.1.2/js/Moxie.xap',
    url: 'http://oss.aliyuncs.com',

    filters: {
        mime_types: [ //只允许上传图片和zip,rar文件
            {title: "Image files", extensions: "jpg,gif,png,bmp"}
            // {title: "Zip files", extensions: "zip,rar"}
        ],
        max_file_size: '10mb', //最大只能上传10mb的文件
        prevent_duplicates: true //不允许选取重复文件
    },

    init: {
        PostInit: function () {
            document.getElementById('ossfile').innerHTML = '';
            document.getElementById('postfiles').onclick = function () {
                set_upload_param(uploader, '', false);
                return false;
            };
        },

        FilesAdded: function (up, files) {
            plupload.each(files, function (file) {
                document.getElementById('ossfile').innerHTML += '<div id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ')<b></b>'
                    + '<div class="progress"><div class="progress-bar" style="width: 0%"></div></div>'
                    + '</div>';
            });
        },

        BeforeUpload: function (up, file) {
            check_object_radio();
            set_upload_param(up, file.name, true);
        },

        UploadProgress: function (up, file) {
            var d = document.getElementById(file.id);
            d.getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
            var prog = d.getElementsByTagName('div')[0];
            var progBar = prog.getElementsByTagName('div')[0]
            progBar.style.width = 2 * file.percent + 'px';
            progBar.setAttribute('aria-valuenow', file.percent);
        },

        FileUploaded: function (up, file, info) {
            if (info.status == 200) {
                //document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = 'upload to oss success, object name:' + get_uploaded_object_name(file.name);
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = '上传成功';
                var img_url = host + '/' + get_uploaded_object_name(file.name);
                $.ajax({
                    url: "/v1/data/anchor/edit_anchor_img/" + user_id,
                    type: "post",
                    data: {"img_url": img_url},
                    success: function (data) {
                        if (data.code === "200") {
                            $('.popover').fadeOut();
                            $('.ui-mask').fadeOut();
                            document.getElementById('ossfile').innerHTML = '';
                            $(".user-img img").attr("src", img_url);
                        } else {
                            console.log("地址提交出错!")
                        }
                    }
                })
            }
            else {
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = info.response;
            }
        },
        Error: function (up, err) {
            if (err.code == -600) {
                document.getElementById('console').appendChild(document.createTextNode("\n选择的文件太大了,可以根据应用情况，在upload.js 设置一下上传的最大大小"));
            }
            else if (err.code == -601) {
                document.getElementById('console').appendChild(document.createTextNode("\n选择的文件后缀不对,可以根据应用情况，在upload.js进行设置可允许的上传文件类型"));
            }
            else if (err.code == -602) {
                document.getElementById('console').appendChild(document.createTextNode("\n这个文件已经上传过一遍了"));
            }
            else {
                document.getElementById('console').appendChild(document.createTextNode("\nError xml:" + err.response));
            }
        }
    }
});

uploader.init();
