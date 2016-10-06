var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var db = require('./lib/mysql').config(require('./db.config.js'));

var app = express();

var loginRecord = {};

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

//用户登录状态查询
app.get('/rest/login/check', function (req, res) {
    var loginId = req.cookies.loginId;
    if (loginId) {
        if (loginId in loginRecord) {
            res.json({
                loginFlag: true,
                username: loginRecord[loginId].username,
                flag: loginRecord[loginId].flag,
                teacherId: loginRecord[loginId].teacherId
            });
        } else {
            res.json({
                loginFlag: false
            });
        }
    } else {
        res.json({
            loginFlag: false
        });
    }
});

//用户登录处理
app.post('/rest/login', function (req, res) {
    var username = req.body.account,
        password = req.body.password;

    var userSql = 'select * from user_info where username = ?';

    //数据库中查询用户信息
    db.query(userSql, [username]).done(function (result, fields) {
        if (result.length === 0) {
            res.json({
                loginFlag: -1
            });
        } else if (result[0].password !== password) {
            res.json({
                loginFlag: -2
            });
        } else {
            var loginId = Math.random() + '' + result[0].user_id;
            loginRecord[loginId] = {
                username: username,
                flag: result[0].flag,
                teacherId: result[0]['teacher_id'] ? result[0]['teacher_id'] : ''
            };
            // console.log(loginRecord);
            res.cookie('loginId', loginId, {
                expires: new Date(Date.now() + 86400000)
            });
            res.json({
                loginFlag: 1,
                username: username,
                flag: result[0].flag,
                teacherId: result[0]['teacher_id'] ? result[0]['teacher_id'] : ''
            });
        }
    });
});

//用户登出处理
app.get('/rest/logout', function (req, res) {
    res.clearCookie('loginId');
    delete loginRecord[req.cookies.loginId];
    res.end('log out');
});

//查询教师基本信息
app.get('/rest/teacher_info', function (req, res) {
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
app.post('/rest/password_change', function (req, res) {
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

//获取工作量年份
app.get('/rest/workload_year', function (req, res) {
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
app.get('/rest/teacher_workload', function (req, res) {
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
app.post('/rest/workload_delete', function (req, res) {
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

    db.query(deleteWorkloadSql, [deleteId]).done(function (result, fields, err) {
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

function getScore(research, graduation, master) {
    return Math.floor(Math.floor(research) / 100 * 0.6 + graduation * 0.15 * 5 + master * 0.25 * 10);
}

//新增教师工作量
app.post('/rest/workload_add', function (req, res) {
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

    db.query(addWorkloadYear, [req.body.teacher_id, req.body.year, research, graduation_design, master_doctor, score]).done(function (result, fields, err) {
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

//修改教师工作量
app.post('/rest/workload_edit', function (req, res) {
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

    db.query(editWorkloadSql, [research, graduation_design, master_doctor, score, req.body.id]).done(function (result, fields, err) {
        if (err) {
            res.json({
                flag: -1
            });
        } else {
            db.query(workloadInfoSql).done(function (result, fields) {
                res.json({
                    flag: 1,
                    teacherWorkload: result[0]
                });
            });
        }
    });
});

//获取上课年份
app.get('/rest/class_year', function (req, res) {
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
app.get('/rest/teacher_class', function (req, res) {
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

//超级管理员
//获取教师基本信息
app.get('/rest/teacher_info_manager', function (req, res) {
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
app.get('/rest/get_teacher_title', function (req, res) {
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
app.post('/rest/teacher_info_manager_add', function (req, res) {
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
app.post('/rest/teacher_info_manager_delete', function (req, res) {
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
});

//修改教师基本信息
app.post('/rest/teacher_info_manager_edit', function (req, res) {
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
    var yearInfoSql = "SELECT\n" +
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

//启动express服务器
app.listen('3000', function () {
    console.log('server started');
});