var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var app = express();

var loginRecord = {};

//加载模板引擎ejs
app.engine('html', require('ejs').renderFile);
app.set('views', './');
app.set('view engine', 'html');

//绑定路由处理
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
    var path = req.path;

    if (/^\/rest\/.+$/g.test(path)) {
        next();
        return;
    }

    if (path == "/") {
        path = "ismartjs/index.html";
    } else {
        path = "ismartjs/" + path;
    }

    if (path.indexOf(".html") != -1) {
        res.render(path);
    } else {
        res.sendFile(path, {root: __dirname});
    }
});

app.get('/rest/login/check', function (req, res) {
    if (req.cookies.loginId) {
        if (req.cookies.loginId in loginRecord) {
            res.json({
                loginFlag: true,
                username: loginRecord[req.cookies.loginId]
            });
        } else {
            res.json({
                loginFlag: false
            });
        }
    } else {
        res.json({
            loginFlag: false
        });
    }
});

app.post('/rest/login', function (req, res) {
    var loginId = Math.random();
    loginRecord[loginId] = req.body.account;

    res.cookie('loginId', loginId, {
        expires: new Date(Date.now() + 900000)
    });
    res.json({
        loginFlag: 1,
        username: req.body.account
    });
});

app.get('/rest/logout', function (req, res) {
    res.clearCookie('loginId');
    delete loginRecord[req.cookies.loginId];
    res.end('log out');
});

//启动express服务器
app.listen('3000', function () {
    console.log('server started');
});