SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS itcast DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE itcast;

DROP TABLE IF EXISTS `pre_emp`;
DROP TABLE IF EXISTS `pre_dept`;
DROP TABLE IF EXISTS `pre_log`;
DROP TABLE IF EXISTS `pre_user`;

CREATE TABLE `pre_user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','viewer') DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `pre_user` VALUES (1,'admin','$2b$10$MXNqs3PeutOT9CojgUlBKeOVX8gQJi8g11zQ5lw/5dCcVyPcpe46a','admin','2026-06-22 09:17:19'),(3,'atao','$2b$10$eciK3UWN7Hld4smkWcTnweIfAUgjEzryGJWZ7XKnghb2vSj15Ohvq','viewer','2026-06-22 16:30:31');

CREATE TABLE `pre_dept` (
  `dept_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `dept_name` varchar(12) NOT NULL,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `dept_name` (`dept_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `pre_dept` VALUES (1,'人事部'),(3,'媒体部'),(2,'开发部'),(4,'销售部');

CREATE TABLE `pre_emp` (
  `emp_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `emp_dept_id` int(10) unsigned NOT NULL,
  `emp_name` varchar(12) NOT NULL,
  `emp_birth` timestamp NULL DEFAULT NULL,
  `emp_entry` timestamp NULL DEFAULT NULL,
  `emp_salary` decimal(10,2) DEFAULT NULL,
  `emp_phone` varchar(20) DEFAULT NULL,
  `emp_email` varchar(100) DEFAULT NULL,
  `emp_gender` enum('男','女') DEFAULT NULL,
  `emp_position` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`emp_id`),
  KEY `emp_dept_id` (`emp_dept_id`),
  CONSTRAINT `pre_emp_ibfk_1` FOREIGN KEY (`emp_dept_id`) REFERENCES `pre_dept` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `pre_emp` VALUES 
(1,1,'张三',NULL,NULL,8000,'13800001001',NULL,NULL,'HR经理'),
(2,1,'李四',NULL,NULL,12000,'13800001002',NULL,NULL,'招聘主管'),
(3,2,'王五',NULL,NULL,15000,'13800001003',NULL,NULL,'高级前端'),
(4,2,'赵六',NULL,NULL,9000,'13800001004',NULL,NULL,'Java工程师'),
(5,3,'张伟',NULL,NULL,10000,'13800001005',NULL,NULL,'UI设计师'),
(7,1,'孙七','1992-08-15','2016-03-01',6000,'13800001007',NULL,NULL,'HR专员'),
(8,2,'周八','1990-11-20','2015-11-15',18000,'13800001008',NULL,NULL,'架构师'),
(9,3,'吴九','1993-01-25','2017-06-01',7500,'13800001009',NULL,NULL,'视频剪辑'),
(10,4,'郑十','1988-06-30','2014-09-10',11000,'13800001010',NULL,NULL,'销售总监'),
(11,1,'陈小明','1994-04-18','2018-07-01',5000,'13800001011',NULL,NULL,'培训专员'),
(12,2,'刘小红','1992-09-05','2016-12-12',16000,'13800001012',NULL,NULL,'后端开发'),
(13,3,'黄大勇','1990-03-22','2015-04-20',8500,'13800001013',NULL,NULL,'摄影师'),
(15,1,'杨志远','1989-10-11','2026-06-03',7000,'13800001015',NULL,NULL,'薪酬主管'),
(16,2,'马丽华','1991-12-28','2026-06-10',14000,'13800001016',NULL,NULL,'测试工程师'),
(17,3,'朱建国','1988-02-14','2013-09-01',9500,'13800001017',NULL,NULL,'新媒体运营'),
(18,4,'胡晓芳','1995-06-06','2019-03-01',10500,'13800001018',NULL,NULL,'客户经理'),
(19,1,'郭文博','1993-11-30','2026-06-18',20000,'13800001019',NULL,NULL,'HRBP');

CREATE TABLE `pre_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `target` varchar(50) DEFAULT NULL,
  `detail` varchar(200) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `pre_log` VALUES (1,'admin','登录系统','admin','','2026-06-22 16:22:34');
