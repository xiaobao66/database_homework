var express = require('express'),
    teacherWorkloadInfoManager = express.Router();

var db;

//获取教师工作量年份
teacherWorkloadInfoManager.get('/rest/workload_year_manager', function (req, res) {
    var yearInfoSql = "SELECT DISTINCT\n" +
        "	`year`\n" +
        "FROM\n" +
        "	job_info";

    yearInfoSql += ' ORDER BY CONVERT (`year`, SIGNED) DESC';

    db.query(yearInfoSql).done(function (result, fields) {
        var data = [];
        for (var i = 0; i < result.length; i++) {
            data[i] = {
                id: result[i].year,
                name: result[i].year
            }
        }
        res.json(data);
    })
});

//获取教师工作量具体信息
teacherWorkloadInfoManager.get('/rest/workload_info_manager', function (req, res) {
    //获取教师工作量总条数
    var totalWorkloadSql = "SELECT\n" +
        "	count(*) total\n" +
        "FROM\n" +
        "	job_info,\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	job_info.teacher_id = teacher_info.teacher_id";

    //获取教师工作量详细信息
    var workloadInfoSql = "SELECT\n" +
        "	job_info.teacher_id,\n" +
        "	teacher_info.`name` teacher_name,\n" +
        "	`year`,\n" +
        "	research,\n" +
        "	graduation_design,\n" +
        "	master_doctor,\n" +
        "	score\n" +
        "FROM\n" +
        "	job_info,\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	job_info.teacher_id = teacher_info.teacher_id";

    if (req.query.teacherId) {
        totalWorkloadSql += ' AND job_info.teacher_id = ' + req.query.teacherId;
        workloadInfoSql += ' AND job_info.teacher_id = ' + req.query.teacherId;
    } else if (req.query.teacherName) {
        totalWorkloadSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
        workloadInfoSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
    }

    if (req.query.year) {
        totalWorkloadSql += ' AND year = ' + req.query.year;
        workloadInfoSql += ' AND year = ' + req.query.year;
    }

    totalWorkloadSql += ' ORDER BY CONVERT (job_info.teacher_id, SIGNED) ASC, CONVERT (`year`, SIGNED) DESC';
    workloadInfoSql += ' ORDER BY CONVERT (job_info.teacher_id, SIGNED) ASC, CONVERT (`year`, SIGNED) DESC';
    workloadInfoSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalWorkloadSql).done(function (result, fields) {
        data.total = result[0].total;
        db.query(workloadInfoSql).done(function (result, fields) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    teacher_id: result[i]['teacher_id'],
                    teacher_name: result[i].teacher_name,
                    year: result[i].year,
                    research: result[i].research,
                    graduation_design: result[i]['graduation_design'],
                    master_doctor: result[i]['master_doctor'],
                    score: result[i].score
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
    teacherWorkloadInfoManager: teacherWorkloadInfoManager
};