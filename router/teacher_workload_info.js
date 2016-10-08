var express = require('express'),
    teacherWorkloadInfo = express.Router();

var db;

//获取工作量年份
teacherWorkloadInfo.get('/rest/workload_year', function (req, res) {
    var workYearSql = "SELECT\n" +
        "	`year`\n" +
        "FROM\n" +
        "	job_info WHERE teacher_id = " + req.query.teacherId;

    db.query(workYearSql).done(function (result, fields) {
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

//获取教师工作量
teacherWorkloadInfo.get('/rest/teacher_workload', function (req, res) {
    //获取教师工作量总条数
    var totalWorkloadSql = "SELECT\n" +
        "	count(*) total\n" +
        "FROM\n" +
        "	job_info\n" +
        "WHERE\n" +
        "	1 = 1\n" +
        " AND teacher_id ='" + req.query.teacherId + "'";

    //获取教师工作量详细信息
    var workloadInfoSql = "SELECT\n" +
        "	id, teacher_id, `year`,\n" +
        "	research,\n" +
        "	graduation_design,\n" +
        "	master_doctor,\n" +
        "	score\n" +
        "FROM\n" +
        "	job_info\n" +
        "WHERE\n" +
        "	1 = 1\n" +
        " AND teacher_id ='" + req.query.teacherId + "'";

    if (req.query.year) {
        totalWorkloadSql += ' AND year = ' + req.query.year;
        workloadInfoSql += ' AND year = ' + req.query.year;
    }

    totalWorkloadSql += ' ORDER BY CONVERT (`year`, SIGNED) DESC';
    workloadInfoSql += ' ORDER BY CONVERT (`year`, SIGNED) DESC';
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
                    id: result[i]['id'],
                    teacher_id: result[i]['teacher_id'],
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

//删除教师工作量
teacherWorkloadInfo.post('/rest/workload_delete', function (req, res) {
    //删除教师工作量sql
    var deleteWorkloadSql = "DELETE\n" +
        "FROM\n" +
        "	job_info\n" +
        "WHERE\n" +
        "	`id` IN ?";

    var deleteData = JSON.parse(req.body.deleteData),
        deleteId = [[]];

    for (var i = 0, len = deleteData.length; i < len; i++) {
        deleteId[0][i] = deleteData[i].id;
    }

    db.query(deleteWorkloadSql, [deleteId]).then(function (result, fields) {
        res.json({
            flag: 1
        });
    }, function (err) {
        res.json({
            flag: -1,
            err: err
        })
    });

});

function getScore(research, graduation, master) {
    return Math.floor(Math.floor(research) / 100 * 0.6 + graduation * 0.15 * 5 + master * 0.25 * 10);
}

//新增教师工作量
teacherWorkloadInfo.post('/rest/workload_add', function (req, res) {
    var addWorkloadYear = "INSERT INTO `job_info` (\n" +
        "	teacher_id,\n" +
        "	`year`,\n" +
        "	research,\n" +
        "	graduation_design,\n" +
        "	master_doctor,\n" +
        "	score\n" +
        ")\n" +
        "VALUES\n" +
        "	(\n" +
        "		?,\n" +
        "		?,\n" +
        "		?,\n" +
        "		?,\n" +
        "		?,\n" +
        "		?\n" +
        "	)";

    var research = parseFloat(req.body.research),
        graduation_design = parseInt(req.body.graduation_design),
        master_doctor = parseInt(req.body.master_doctor);

    var score = getScore(research, graduation_design, master_doctor);

    db.query(addWorkloadYear, [req.body.teacher_id, req.body.year, research, graduation_design, master_doctor, score]).then(function (result, fields) {
        res.json({
            flag: 1
        });
    }, function (err) {
        res.json({
            flag: -1,
            err: err
        })
    });
});

//修改教师工作量
teacherWorkloadInfo.post('/rest/workload_edit', function (req, res) {
    var editWorkloadSql = "UPDATE job_info\n" +
        "SET research = ?,\n" +
        " graduation_design = ?,\n" +
        " master_doctor = ?,\n" +
        " score = ?\n" +
        "WHERE\n" +
        "	id = ?";

    var workloadInfoSql = "SELECT\n" +
        "	id, teacher_id, `year`,\n" +
        "	research,\n" +
        "	graduation_design,\n" +
        "	master_doctor,\n" +
        "	score\n" +
        "FROM\n" +
        "	job_info\n" +
        "WHERE\n" +
        "	1 = 1\n" +
        " AND id ='" + req.body.id + "'";

    var research = parseFloat(req.body.research),
        graduation_design = parseInt(req.body.graduation_design),
        master_doctor = parseInt(req.body.master_doctor);

    var score = getScore(research, graduation_design, master_doctor);

    db.query(editWorkloadSql, [research, graduation_design, master_doctor, score, req.body.id]).then(function (result, fields) {
        db.query(workloadInfoSql).done(function (result, fields) {
            res.json({
                flag: 1,
                teacherWorkload: result[0]
            });
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
    teacherWorloadInfo: teacherWorkloadInfo
};