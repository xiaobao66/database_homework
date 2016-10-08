var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

//路由管理
var login = require('./router/login');
var teacherInfo = require('./router/teacher_info');
var teacherWorkloadInfo = require('./router/teacher_workload_info');
var teacherClassInfo = require('./router/teacher_class_info');
var teacherInfoManager = require('./router/teacher_info_manager');
var userInfoManager = require('./router/user_info_manager');
var titleInfoManager = require('./router/title_info_manager');
var teacherWorkloadInfoManager = require('./router/teacher_workload_info_manager');
var classInfoManager = require('./router/class_info_manager');

var db = require('./lib/mysql').config(require('./db.config.js'));

var app = express();

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

//用户登录处理
login.config(db);
app.use('/', login.login);

//教师基本信息路由处理
teacherInfo.config(db);
app.use('/', teacherInfo.teacherInfo);

//教师工作量路由处理
teacherWorkloadInfo.config(db);
app.use('/', teacherWorkloadInfo.teacherWorloadInfo);

//教师上课信息路由处理
teacherClassInfo.config(db);
app.use('/', teacherClassInfo.teacherClassInfo);

//超级管理员
//教师基本信息路由处理
teacherInfoManager.config(db);
app.use('/', teacherInfoManager.teacherInfoManager);

//用户信息路由处理
userInfoManager.config(db);
app.use('/', userInfoManager.userInfoManager);

//职称信息路由处理
titleInfoManager.config(db);
app.use('/', titleInfoManager.titleInfoManager);

//教师工作量路由处理
teacherWorkloadInfoManager.config(db);
app.use('/', teacherWorkloadInfoManager.teacherWorkloadInfoManager);

//课程信息路由处理
classInfoManager.config(db);
app.use('/', classInfoManager.classInfoManager);

//获取教师上课年份
app.get('/rest/teacher_teach_class_year', function (req, res) {
    var teacherTeachClassYear = "SELECT DISTINCT\n" +
        "	`year`\n" +
        "FROM\n" +
        "	teacher_class_info";

    db.query(teacherTeachClassYear).done(function (result, fields) {
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

app.get('/rest/teacher_teach_class_manager', function (req, res) {
    var totalTeacherTeachClassSql = "SELECT\n" +
        "	count(*) total\n" +
        "FROM\n" +
        "	teacher_class_info,\n" +
        "	class_info,\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	teacher_class_info.teacher_id = teacher_info.teacher_id\n" +
        "AND teacher_class_info.class_id = class_info.class_id";

    var teacherTeachClassSql = "SELECT\n" +
        "	teacher_class_info.id,\n" +
        "	teacher_class_info.teacher_id,\n" +
        "	teacher_class_info.class_id,\n" +
        "	teacher_info.`name` teacher_name,\n" +
        "	class_info.`name` class_name,\n" +
        "	teacher_class_info.`year`,\n" +
        "	class_info.class_time,\n" +
        "	class_info.experiment_time,\n" +
        "	student_number\n" +
        "FROM\n" +
        "	teacher_class_info,\n" +
        "	class_info,\n" +
        "	teacher_info\n" +
        "WHERE\n" +
        "	teacher_class_info.teacher_id = teacher_info.teacher_id\n" +
        "AND teacher_class_info.class_id = class_info.class_id"

    if (req.query.teacherName) {
        totalTeacherTeachClassSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
        teacherTeachClassSql += ' AND teacher_info.`name` LIKE ' + "'%" + req.query.teacherName + "%'";
    }
    if (req.query.className) {
        totalTeacherTeachClassSql += ' AND class_info.`name` LIKE ' + "'%" + req.query.className + "%'";
        teacherTeachClassSql += ' AND class_info.`name` LIKE ' + "'%" + req.query.className + "%'";
    }

    if (req.query.year) {
        totalTeacherTeachClassSql += ' AND teacher_class_info.year = ' + req.query.year;
        teacherTeachClassSql += ' AND teacher_class_info.year = ' + req.query.year;
    }

    teacherTeachClassSql += ' LIMIT ' + (req.query.page - 1) * req.query.pageSize + ', ' + req.query.pageSize;

    var data = {
        page: req.query.page,
        pageSize: req.query.pageSize
    };

    db.query(totalTeacherTeachClassSql).done(function (result, fields) {
        data.total = result[0].total;
        db.query(teacherTeachClassSql).done(function (result, fields) {
            data.results = [];
            for (var i = 0; i < result.length; i++) {
                data.results[i] = {
                    id: result[i].id,
                    teacher_id: result[i].teacher_id,
                    class_id: result[i].class_id,
                    teacher_name: result[i].teacher_name,
                    class_name: result[i].class_name,
                    year: result[i].year,
                    class_time: result[i].class_time,
                    experiment_time: result[i].experiment_time,
                    student_number: result[i].student_number
                }
            }
            res.json(data);
        })
    })
});

//获取教师名
app.get('/rest/get_teacher_name', function (req, res) {
    var getTeacherNameSql = "SELECT\n" +
        "	teacher_id,\n" +
        "	`name`\n" +
        "FROM\n" +
        "	teacher_info";

    db.query(getTeacherNameSql).done(function (result, fields) {
        var data = [];
        for (var i = 0; i < result.length; i++) {
            data[i] = {
                id: result[i].teacher_id,
                name: result[i].name
            }
        }
        res.json(data);
    });
});

//获取课程名
app.get('/rest/get_class_name', function (req, res) {
    var getClassNameSql = "SELECT\n" +
        "	class_id,\n" +
        "	`name`\n" +
        "FROM\n" +
        "	class_info";

    db.query(getClassNameSql).done(function (result, fields) {
        var data = [];
        for (var i = 0; i < result.length; i++) {
            data[i] = {
                id: result[i].class_id,
                name: result[i].name
            }
        }
        res.json(data);
    });
});

//新增教师上课信息
app.post('/rest/teacher_class_info_manager_add', function (req, res) {
    var insertTeacherTeachClassSql = "INSERT INTO teacher_class_info (\n" +
        "	teacher_id,\n" +
        "	class_id,\n" +
        "	`year`,\n" +
        "	student_number\n" +
        ")\n" +
        "VALUES\n" +
        "	(?,?,?,?)";

    db.query(insertTeacherTeachClassSql, [req.body.teacher_id, req.body.class_id, req.body.year, req.body.student_number]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            })
        } else {
            res.json({
                flag: 1
            })
        }
    })
});

//删除教师上课信息
app.post('/rest/teacher_class_info_manager_delete', function (req, res) {
    var deleteTeacherTeachClassSql = "DELETE\n" +
        "FROM\n" +
        "	teacher_class_info\n" +
        "WHERE\n" +
        "	`id` IN ?";

    var deleteData = JSON.parse(req.body.deleteData),
        deleteId = [[]];

    for (var i = 0, len = deleteData.length; i < len; i++) {
        deleteId[0][i] = deleteData[i].id;
    }

    db.query(deleteTeacherTeachClassSql, [deleteId]).done(function (result, fields, err) {
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

//修改教师上课信息
app.post('/rest/teacher_class_info_manager_edit', function (req, res) {
    var updateTeacherTeachClassSql = "UPDATE teacher_class_info\n" +
        "SET teacher_id = ?,\n" +
        " class_id = ?,\n" +
        " `year` = ?,\n" +
        " student_number = ?\n" +
        "WHERE\n" +
        "	`id` = ?";

    db.query(updateTeacherTeachClassSql, [req.body.teacher_id, req.body.class_id, req.body.year, req.body.student_number, req.body.id]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            })
        } else {
            res.json({
                flag: 1
            })
        }
    });
});

//启动express服务器
app.listen('3000', function () {
    console.log('server started');
});