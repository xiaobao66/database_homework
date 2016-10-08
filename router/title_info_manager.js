var express = require('express'),
    titleInfoManager = express.Router();

var db;

//查询职称信息
titleInfoManager.get('/rest/title_info_manager', function (req, res) {
    var totalTitleInfoSql = "SELECT\n" +
        "	count(*) total\n" +
        "FROM\n" +
        "	title_info\n" +
        "WHERE\n" +
        "	1 = 1";

    var titleInfoSql = "SELECT\n" +
        "	*\n" +
        "FROM\n" +
        "	title_info\n" +
        "WHERE\n" +
        "	1 = 1";

    if (req.query.titleName) {
        totalTitleInfoSql += ' AND `name` LIKE ' + "'%" + req.query.titleName + "%'";
        titleInfoSql += ' AND `name` LIKE ' + "'%" + req.query.titleName + "%'";
    }

    titleInfoSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalTitleInfoSql).done(function (result, fields, err) {
        data.total = result[0].total;
        db.query(titleInfoSql).done(function (result, fields, err) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    title_id: result[i].title_id,
                    name: result[i].name,
                    salary: result[i].salary,
                    allowance: result[i].allowance
                }
            }

            res.json(data);
        })
    });
});

//新增职称信息
titleInfoManager.post('/rest/title_info_manager_add', function (req, res) {
    var insertTitleInfoSql = "INSERT INTO title_info (`name`, salary, allowance)\n" +
        "VALUES\n" +
        "	(?, ?, ?)";

    db.query(insertTitleInfoSql, [req.body.title_name, req.body.salary, req.body.allowance]).done(function (result, fields, err) {
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
});

//删除职称信息
titleInfoManager.post('/rest/title_info_manager_delete', function (req, res) {
    var deleteTitleInfoSql = "DELETE\n" +
        "FROM\n" +
        "	title_info\n" +
        "WHERE\n" +
        "	title_id IN ?";

    var deleteData = JSON.parse(req.body.deleteData),
        deleteId = [[]];

    for (var i = 0, len = deleteData.length; i < len; i++) {
        deleteId[0][i] = deleteData[i].title_id;
    }

    db.query(deleteTitleInfoSql, [deleteId]).done(function (result, fields, err) {
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
});

//修改职称信息
titleInfoManager.post('/rest/title_info_manager_edit', function (req, res) {
    var updateTitleInfoSql = "UPDATE title_info\n" +
        "SET `name` = ?,\n" +
        " salary = ?,\n" +
        " allowance = ?\n" +
        "WHERE\n" +
        "	title_id = ?";

    db.query(updateTitleInfoSql, [req.body.name, req.body.salary, req.body.allowance, req.body.title_id]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            });
        } else {
            res.json({
                flag: 1,
                titleInfo: req.body
            });
        }
    });
});

module.exports = {
    config: function (dbConfig) {
        db = dbConfig;
    },
    titleInfoManager: titleInfoManager
};