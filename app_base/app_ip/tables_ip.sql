--
-- Table structure for table `t_log_ip_user`
--
DROP TABLE IF EXISTS `t_log_ip_user`;
CREATE TABLE `t_log_ip_user` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '纪录编号',
  `user_id` varchar(32) DEFAULT '' COMMENT '用户编号',
  `ip` varchar(48) NOT NULL COMMENT 'IP',
  `ip_address` varchar(64) DEFAULT '' COMMENT 'IP所在地',
  `count` int(11) DEFAULT '0' COMMENT '使用次数',
  PRIMARY KEY (`log_id`),
  UNIQUE KEY `UQ_USER_IP` (`user_id`,`ip`)
) ENGINE=InnoDB AUTO_INCREMENT=88888 DEFAULT CHARSET=utf8 COMMENT='用户ip记录表';


--
-- Table structure for table `t_log_ip_count`
--
DROP TABLE IF EXISTS `t_log_ip_count`;
CREATE TABLE `t_log_ip_count` (
  `ip` varchar(48) NOT NULL DEFAULT '' COMMENT 'IP',
  `ip_address` varchar(64) DEFAULT '' COMMENT 'IP所在地',
  `count` int(11) DEFAULT '0' COMMENT '使用次数',
  PRIMARY KEY (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='ip记录统计表';
