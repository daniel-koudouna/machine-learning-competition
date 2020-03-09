CREATE TABLE IF NOT EXISTS `__DB`.`users` (
  `username` VARCHAR(45) NOT NULL,
  `password` VARCHAR(255) NULL,
  `email` VARCHAR(45) NULL,
  `resetPasswordToken` VARCHAR(255) NULL,
  `resetPasswordExpires` BIGINT(20) UNSIGNED NULL,
  PRIMARY KEY (`username`),
  UNIQUE INDEX `username_UNIQUE` (`username` ASC));
