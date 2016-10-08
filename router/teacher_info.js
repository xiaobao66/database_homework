var express = require('express'),
    teacherInfo = express.Router();

var db;

//查询教师基本信息
teacherInfo.get('/rest/teacher_info', function (req, res) {
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
teacherInfo.post('/rest/password_change', function (req, res) {
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

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    teacherInfo: teacherInfo
};