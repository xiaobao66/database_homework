var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var db = require('./lib/mysql').config(require('./db.config.js'));

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

//用户登录状态查询
app.get('/rest/login/check', function (req, res) {
    var loginId = req.cookies.loginId;
    if (loginId) {
        if (loginId in loginRecord) {
            res.json({
                loginFlag: true,
                username: loginRecord[loginId].username,
                flag: loginRecord[loginId].flag,
                teacherId: loginRecord[loginId].teacherId
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

//用户登录处理
app.post('/rest/login', function (req, res) {
    var username = req.body.account,
        password = req.body.password;

    var userSql = 'select * from user_info where username = ?';

    //数据库中查询用户信息
    db.query(userSql, [username]).done(function (result, fields) {
        if (result.length === 0) {
            res.json({
                loginFlag: -1
            });
        } else if (result[0].password !== password) {
            res.json({
                loginFlag: -2
            });
        } else {
            var loginId = Math.random() + '' + result[0].user_id;
            loginRecord[loginId] = {
                username: username,
                flag: result[0].flag,
                teacherId: result[0]['teacher_id'] ? result[0]['teacher_id'] : ''
            };
            // console.log(loginRecord);
            res.cookie('loginId', loginId, {
                expires: new Date(Date.now() + 900000)
            });
            res.json({
                loginFlag: 1,
                username: username,
                flag: result[0].flag,
                teacherId: result[0]['teacher_id'] ? result[0]['teacher_id'] : ''
            });
        }
    });
});

//用户登出处理
app.get('/rest/logout', function (req, res) {
    res.clearCookie('loginId');
    delete loginRecord[req.cookies.loginId];
    res.end('log out');
});

//查询教师基本信息
app.get('/rest/teacher_info', function (req, res) {
    var teacherInfoSql = "SELECT\n" +
        "	teacher_info.`name` teacher_name,\n" +
        "	sex,\n" +
        "	college,\n" +
        "	title_info.`name` title_name,\n" +
        "	salary,\n" +
        "	allowance\n" +
        "FROM\n" +
        "	teacher_info,\n" +
        "	title_info\n" +
        "WHERE\n" +
        "	teacher_info.title_id = title_info.title_id\n" +
        "AND teacher_info.teacher_id = ?";

    db.query(teacherInfoSql, [req.query.teacherId]).done(function (result, fields) {
        if (result.length === 0) {
            res.json({});
        } else {
            res.json({
                teacher_name: result[0]['teacher_name'],
                sex: result[0].sex,
                college: result[0].college,
                title_name: result[0]['title_name'],
                salary: result[0].salary,
                allowance: result[0].allowance
            });
        }
    });
});

//修改账户密码
app.post('/rest/password_change', function (req, res) {
    var username = req.body.username,
        oldPassword = req.body.oldPassword,
        newPassword = req.body.newPassword;

    var checkAccountSql = "SELECT\n" +
        "	*\n" +
        "FROM\n" +
        "	user_info\n" +
        "WHERE\n" +
        "	username = ?\n" +
        "AND PASSWORD = ?"

    var updateAccountSql = "UPDATE user_info\n" +
        "SET `password` = ?\n" +
        "WHERE\n" +
        "	username = ?";

    db.query(checkAccountSql, [username, oldPassword]).done(function (result, fields) {
        if (result.length > 0) {
            db.query(updateAccountSql, [newPassword, username]).done(function (result, field, err) {
                if (err) {
                    res.json({
                        flag: -2
                    });
                } else {
                    res.json({
                        flag: 1
                    });
                }
            });
        } else {
            res.json({
                flag: -1
            })
        }
    });
});

//启动express服务器
app.listen('3000', function () {
    console.log('server started');
});