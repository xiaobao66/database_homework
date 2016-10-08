var express = require('express'),
    login = express.Router();

var db;
var loginRecord = {};

//用户登录状态查询
login.get('/rest/login/check', function (req, res) {
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
login.post('/rest/login', function (req, res) {
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
                expires: new Date(Date.now() + 86400000)
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
login.get('/rest/logout', function (req, res) {
    res.clearCookie('loginId');
    delete loginRecord[req.cookies.loginId];
    res.end('log out');
});

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    login: login
};