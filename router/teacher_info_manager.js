var express = require('express'),
    teacherInfoManager = express.Router();

var db;

//获取教师基本信息
teacherInfoManager.get('/rest/teacher_info_manager', function (req, res) {
    //获取教师基本信息总条数
    var totalTeacherSql = "SELECT\n" +
        "	COUNT(*) total\n" +
        "FROM\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	1 = 1";

    //获取教师基本信息详情
    var teacherInfoSql = "SELECT\n" +
        "	teacher_id,\n" +
        "	teacher_info.`name` teacher_name,\n" +
        "	sex,\n" +
        "	college,\n" +
        "	title_info.title_id,\n" +
        "	title_info.`name` title_name\n" +
        "FROM\n" +
        "	teacher_info,\n" +
        "	title_info\n" +
        "WHERE\n" +
        "	teacher_info.title_id = title_info.title_id";

    if (req.query.teacherId) {
        totalTeacherSql += ' AND teacher_info.teacher_id LIKE ' + "'%" + req.query.teacherId + "%'";
        teacherInfoSql += ' AND teacher_info.teacher_id LIKE ' + "'%" + req.query.teacherId + "%'";
    } else if (req.query.teacherName) {
        totalTeacherSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
        teacherInfoSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
    }

    teacherInfoSql += ' ORDER BY CONVERT (`teacher_id`, SIGNED) ASC';
    teacherInfoSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalTeacherSql).done(function (result, fields) {
        data.total = result[0].total;
        db.query(teacherInfoSql).done(function (result, fields) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    teacher_id: result[i].teacher_id,
                    teacher_name: result[i].teacher_name,
                    sex: result[i].sex,
                    college: result[i].college,
                    title_id: result[i].title_id,
                    title_name: result[i].title_name
                }
            }
            res.json(data);
        })
    })
});

//获取教师职称信息
teacherInfoManager.get('/rest/get_teacher_title', function (req, res) {
    var teacherTitleSql = "SELECT\n" +
        "	title_id,\n" +
        "	`name`\n" +
        "FROM\n" +
        "	title_info";

    db.query(teacherTitleSql).done(function (result, fields) {
        var data = [];
        for (var i = 0; i < result.length; i++) {
            data[i] = {
                id: result[i].title_id,
                name: result[i].name
            }
        }
        res.json(data);
    });
});

//新增教师基本信息
teacherInfoManager.post('/rest/teacher_info_manager_add', function (req, res) {
    var insertTeacherInfoSql = "INSERT INTO teacher_info (\n" +
        "	teacher_id,\n" +
        "	`name`,\n" +
        "	sex,\n" +
        "	college,\n" +
        "	title_id\n" +
        ")\n" +
        "VALUES\n" +
        "	(\n" +
        "		?,\n" +
        "		?,\n" +
        "		?,\n" +
        "		?,\n" +
        "		?\n" +
        "	)";

    var insertUserInfoSql = "INSERT INTO user_info (\n" +
        "	`username`,\n" +
        "	`password`,\n" +
        "	flag,\n" +
        "	teacher_id\n" +
        ")\n" +
        "VALUES\n" +
        "	(\n" +
        "		?,\n" +
        "		?,\n" +
        "		?,\n" +
        "		?\n" +
        "	)";

    db.query(insertTeacherInfoSql, [req.body.teacher_id, req.body.teacher_name, req.body.sex, req.body.college, req.body.title_id]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            });
        } else {
            db.query(insertUserInfoSql, [req.body.teacher_id, '123456', 0, req.body.teacher_id]).done(function (result, fields, err) {
                if (err) {
                    res.json({
                        flag: -1
                    });
                } else {
                    res.json({
                        flag: 1
                    });
                }
            });
        }
    });
});

//删除教师基本信息
teacherInfoManager.post('/rest/teacher_info_manager_delete', function (req, res) {
    var deleteUserInfoSql = "DELETE\n" +
        "FROM\n" +
        "	user_info\n" +
        "WHERE\n" +
        "	teacher_id IN ?";

    var deleteTeacherInfoSql = "DELETE\n" +
        "FROM\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	`teacher_id` IN ?";

    var deleteData = JSON.parse(req.body.deleteData),
        deleteId = [[]];

    for (var i = 0, len = deleteData.length; i < len; i++) {
        deleteId[0][i] = deleteData[i].teacher_id;
    }

    db.query(deleteUserInfoSql, [deleteId]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            });
        } else {
            db.query(deleteTeacherInfoSql, [deleteId]).done(function (result, fields, err) {
                if (err) {
                    res.json({
                        flag: -1
                    });
                } else {
                    res.json({
                        flag: 1
                    });
                }
            });
        }
    });
});

//修改教师基本信息
teacherInfoManager.post('/rest/teacher_info_manager_edit', function (req, res) {
    var updateTeacherInfoSql = "UPDATE teacher_info\n" +
        "SET `name` = ?,\n" +
        " sex = ?,\n" +
        " college = ?,\n" +
        " title_id = ?\n" +
        "WHERE\n" +
        "	teacher_id = ?";

    db.query(updateTeacherInfoSql, [req.body.teacher_name, req.body.sex, req.body.college, req.body.title_id, req.body.teacher_id]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            });
        } else {
            res.json({
                flag: 1,
                teacherInfo: req.body
            });
        }
    });
});

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    teacherInfoManager: teacherInfoManager
};