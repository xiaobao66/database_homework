var express = require('express'),
    classInfoManager = express.Router();

var db;

//获取课程信息
classInfoManager.get('/rest/class_info_manager', function (req, res) {
    //获取课程信息总条数
    var totalClassInfoSql = "SELECT\n" +
        "	count(*) total\n" +
        "FROM\n" +
        "	class_info\n" +
        "WHERE\n" +
        "	1 = 1";

    //获取课程详细信息
    var classInfoSql = "SELECT\n" +
        "	*\n" +
        "FROM\n" +
        "	class_info\n" +
        "WHERE\n" +
        "	1 = 1";

    if (req.query.classId) {
        totalClassInfoSql += ' AND class_id = ' + req.query.classId;
        classInfoSql += ' AND class_id = ' + req.query.classId;
    } else if (req.query.className) {
        totalClassInfoSql += ' AND `name` LIKE ' + "'%" + req.query.className + "%'";
        classInfoSql += ' AND `name` LIKE ' + "'%" + req.query.className + "%'";
    }

    classInfoSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalClassInfoSql).done(function (result, fields) {
        data.total = result[0].total;
        db.query(classInfoSql).done(function (result, fields) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    class_id: result[i]['class_id'],
                    name: result[i].name,
                    class_time: result[i]['class_time'],
                    experiment_time: result[i]['experiment_time']
                }
            }
            res.json(data);
        })
    })
});

//新增课程信息
classInfoManager.post('/rest/class_info_manager_add', function (req, res) {
    var insertClassInfoSql = "INSERT INTO class_info (\n" +
        "	class_id,\n" +
        "	`name`,\n" +
        "	class_time,\n" +
        "	experiment_time\n" +
        ")\n" +
        "VALUES\n" +
        "	(?, ?, ?, ?)";

    db.query(insertClassInfoSql, [req.body.class_id, req.body.class_name, req.body.class_time, req.body.experiment_time]).then(function (result, fields) {
        res.json({
            flag: 1
        })
    }, function (err) {
        res.json({
            flag: -1,
            err: err
        })
    });
});

//删除课程信息
classInfoManager.post('/rest/class_info_manager_delete', function (req, res) {
    var deleteClassInfoSql = "DELETE\n" +
        "FROM\n" +
        "	class_info\n" +
        "WHERE\n" +
        "	class_id IN ?";

    var deleteData = JSON.parse(req.body.deleteData),
        deleteId = [[]];

    for (var i = 0, len = deleteData.length; i < len; i++) {
        deleteId[0][i] = deleteData[i].id;
    }

    db.query(deleteClassInfoSql, [deleteId]).then(function (result, fields) {
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

//修改课程信息
classInfoManager.post('/rest/class_info_manager_edit', function (req, res) {
    var updateClassInfoSql = "UPDATE class_info\n" +
        "SET `name` = ?,\n" +
        " class_time = ?,\n" +
        " experiment_time = ?\n" +
        "WHERE\n" +
        "	class_id = ?";

    db.query(updateClassInfoSql, [req.body.name, req.body.class_time, req.body.experiment_time, req.body.class_id]).then(function (result, fields) {
        res.json({
            flag: 1,
            classInfo: req.body
        })
    }, function (err) {
        res.json({
            flag: -1,
            err: err
        })
    })
});

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    classInfoManager: classInfoManager
};