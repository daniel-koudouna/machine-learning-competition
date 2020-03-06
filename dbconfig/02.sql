CREATE TABLE IF NOT EXISTS `competition`.`tasks` (
  `name` varchar(80) NOT NULL,
  `type` int(11) NOT NULL DEFAULT '0',
  `ground_truth` varchar(255) NOT NULL,
  `submissions` int(11) DEFAULT '5',
  PRIMARY KEY (`name`),
  UNIQUE INDEX `name_UNIQUE` (`name` ASC));
