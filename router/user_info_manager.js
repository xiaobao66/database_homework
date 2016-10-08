var express = require('express'),
    userInfoManager = express.Router();

var db;

//获取用户信息
userInfoManager.get('/rest/user_info_manager', function (req, res) {
    var totalUserInfoSql = "SELECT\n" +
        "	COUNT(*) total\n" +
        "FROM\n" +
        "	user_info,\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	user_info.teacher_id = teacher_info.teacher_id";

    var userInfoSql = "SELECT\n" +
        "	username,\n" +
        "	`password`,\n" +
        "	flag,\n" +
        "	teacher_info.teacher_id,\n" +
        "	`name`\n" +
        "FROM\n" +
        "	user_info,\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	user_info.teacher_id = teacher_info.teacher_id";

    if (req.query.teacherId) {
        totalUserInfoSql += ' AND user_info.teacher_id LIKE ' + "'%" + req.query.teacherId + "%'";
        userInfoSql += ' AND user_info.teacher_id LIKE ' + "'%" + req.query.teacherId + "%'";
    } else if (req.query.teacherName) {
        totalUserInfoSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
        userInfoSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
    }

    userInfoSql += ' ORDER BY CONVERT (teacher_info.teacher_id, SIGNED) ASC';
    userInfoSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalUserInfoSql).done(function (result, fields) {
        data.total = result[0].total;
        db.query(userInfoSql).done(function (result, fields) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    teacher_id: result[i].teacher_id,
                    teacher_name: result[i].name,
                    flag: result[i].flag,
                    username: result[i].username,
                    password: result[i].password
                }
            }
            res.json(data);
        })
    })
});

//修改用户信息(修改密码)
userInfoManager.post('/rest/user_info_manager_edit', function (req, res) {
    var updateUserInfoSql = "UPDATE user_info\n" +
        "SET `password` = ?\n" +
        "WHERE\n" +
        "	username = ?";

    db.query(updateUserInfoSql, [req.body.password, req.body.username]).then(function (result, fields) {
        res.json({
            flag: 1,
            userInfo: req.body
        });
    }, function (err) {
        res.json({
            flag: -1,
            err: err
        })
    });
});

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    userInfoManager: userInfoManager
};