# Machine Learning Competition Server

A configurable server for hosting competitions for CS5014.

## Running

The server is a node application. It can be run with the usual node commands:

`npm install`
`npm start`

## Server configuration

The server accepts a number of configurable parameters:

- DB_HOST     : The location of the databse
- DB_USER     : The user of the database
- DB_PASSWORD : The password for the user
- DB_PORT     : The port the DB is listening
- PORT        : The port that the server will be hosted on

The values may be hard coded in the application in `config/database.js`, or run by a script, e.g:

`DB_USER="kt54" DB_PASSWORD="dumbo" PORT="12345" npm start`

## Databse configuration

The database is automatically configured by the application. The files in `dbconfig` will be run sequentially to setup the database. Ensure that the database name is not already in use.

## Competition configuration

The server is capable of running multiple competitions at the same time. The competition setup is specified in `config/tasks.json`.
The competition setup is a JSON array containing competition objects. Each object has the following keys:

- name          : The display name of the competiton
- submissions   : The maxmimum number of submissions per user
- type          : The type of competition, either 'classification' or 'regression'
- ground_truth  : The name of the file relative to the `data` directory which contains the ground truth values.

## Score calculation

Currently, classification and regression tasks are supported. The calculation for each is made in `app/scoreCalculator.js`. The scores are sorted as appropriate in the ranking (i.e less RMSE is better but more accuracy is better).

## Users

Users should ideally sign up with their university login. There is a function to send emails to users if they forget their password. However, this is untested. Otherwise, users sign up with the usual username/password combination. (The @st-andrews.ac.uk is automatically appended to form the email address for now.)
