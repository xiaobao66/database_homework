var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

//路由管理
var login = require('./router/login');
var teacherInfo = require('./router/teacher_info');
var teacherWorkloadInfo = require('./router/teacher_workload_info');
var teacherClassInfo = require('./router/teacher_class_info');
var teacherInfoManager = require('./router/teacher_info_manager');

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
//教师基本信息管理
teacherInfoManager.config(db);
app.use('/', teacherInfoManager.teacherInfoManager);

//获取用户信息
app.get('/rest/user_info_manager', function (req, res) {
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
app.post('/rest/user_info_manager_edit', function (req, res) {
    var updateUserInfoSql = "UPDATE user_info\n" +
        "SET `password` = ?\n" +
        "WHERE\n" +
        "	username = ?";

    db.query(updateUserInfoSql, [req.body.password, req.body.username]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            });
        } else {
            res.json({
                flag: 1,
                userInfo: req.body
            });
        }
    });
});

//查询职称信息
app.get('/rest/title_info_manager', function (req, res) {
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
app.post('/rest/title_info_manager_add', function (req, res) {
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
app.post('/rest/title_info_manager_delete', function (req, res) {
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
app.post('/rest/title_info_manager_edit', function (req, res) {
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

//获取教师工作量年份
app.get('/rest/workload_year_manager', function (req, res) {
    var yearInfoSql = "SELECT DISTINCT\n" +
        "	`year`\n" +
        "FROM\n" +
        "	job_info";

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
app.get('/rest/workload_info_manager', function (req, res) {
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

//获取课程信息
app.get('/rest/class_info_manager', function (req, res) {
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
app.post('/rest/class_info_manager_add', function (req, res) {
    var insertClassInfoSql = "INSERT INTO class_info (\n" +
        "	class_id,\n" +
        "	`name`,\n" +
        "	class_time,\n" +
        "	experiment_time\n" +
        ")\n" +
        "VALUES\n" +
        "	(?, ?, ?, ?)";

    db.query(insertClassInfoSql, [req.body.class_id, req.body.class_name, req.body.class_time, req.body.experiment_time]).done(function (result, fields, err) {
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

//删除课程信息
app.post('/rest/class_info_manager_delete', function (req, res) {
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

    db.query(deleteClassInfoSql, [deleteId]).done(function (result, fields, err) {
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

//修改课程信息
app.post('/rest/class_info_manager_edit', function (req, res) {
    var updateClassInfoSql = "UPDATE class_info\n" +
        "SET `name` = ?,\n" +
        " class_time = ?,\n" +
        " experiment_time = ?\n" +
        "WHERE\n" +
        "	class_id = ?";

    db.query(updateClassInfoSql, [req.body.name, req.body.class_time, req.body.experiment_time, req.body.class_id]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            })
        } else {
            res.json({
                flag: 1,
                classInfo: req.body
            })
        }
    })
});

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