
CREATE TABLE IF NOT EXISTS `competition`.`submissions` (
  `user_id` VARCHAR(45) NOT NULL,
  `task_id` VARCHAR(80) NOT NULL,
  `id` INT NOT NULL AUTO_INCREMENT,
  `score` DOUBLE NULL,
  `file` MEDIUMBLOB NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `task_id`, `id`),
  INDEX `task_id_idx` (`task_id` ASC),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC),
  CONSTRAINT `user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `competition`.`users` (`username`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `task_id`
    FOREIGN KEY (`task_id`)
    REFERENCES `competition`.`tasks` (`name`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);
