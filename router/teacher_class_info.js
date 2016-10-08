var express = require('express'),
    teacherClassInfo = express.Router();

var db;

//获取上课年份
teacherClassInfo.get('/rest/class_year', function (req, res) {
    var classYear = "SELECT\n" +
        "	`year`\n" +
        "FROM\n" +
        "	teacher_class_info\n" +
        "WHERE\n" +
        "	teacher_id = " + req.query.teacherId;

    db.query(classYear).done(function (result, fields) {
        var data = [];
        for (var i = 0; i < result.length; i++) {
            data[i] = {
                id: result[i].year,
                name: result[i].year
            }
        }
        res.json(data);
    });
});

//获取教师上课信息
teacherClassInfo.get('/rest/teacher_class', function (req, res) {
    //获取教师上课信息总条数
    var totalClassSql = "SELECT\n" +
        "	count(*) total\n" +
        "FROM\n" +
        "	teacher_class_info,\n" +
        "	class_info\n" +
        "WHERE\n" +
        "	teacher_class_info.class_id = class_info.class_id AND teacher_id ='" + req.query.teacherId + "'";

    //获取教师上课详细信息
    var classInfoSql = "SELECT\n" +
        "	`year`,\n" +
        "	`name`,\n" +
        "	class_time,\n" +
        "	experiment_time,\n" +
        "	student_number\n" +
        "FROM\n" +
        "	teacher_class_info,\n" +
        "	class_info\n" +
        "WHERE\n" +
        "	teacher_class_info.class_id = class_info.class_id AND teacher_id ='" + req.query.teacherId + "'";

    if (req.query.year) {
        totalClassSql += ' AND year = ' + req.query.year;
        classInfoSql += ' AND year = ' + req.query.year;
    }

    totalClassSql += ' ORDER BY CONVERT (`year`, SIGNED) DESC';
    classInfoSql += ' ORDER BY CONVERT (`year`, SIGNED) DESC';
    classInfoSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalClassSql).done(function (result, fields) {
        data.total = result[0].total;
        db.query(classInfoSql).done(function (result, fields) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    year: result[i].year,
                    name: result[i].name,
                    class_time: result[i]['class_time'],
                    experiment_time: result[i]['experiment_time'],
                    student_number: result[i]['student_number']
                }
            }
            res.json(data);
        })
    })
});

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    teacherClassInfo: teacherClassInfo
};