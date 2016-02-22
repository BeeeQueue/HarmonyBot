/**
 * Created by bq on 2016-02-16.
 */

var util = require("util");
var MySQL = require("mysql");
var EE = require("events").EventEmitter;
var mysql;

function Statscord (interval, database)
{
	mysql = MySQL.createConnection({
		host:     database.host,
		user:     database.user,
		password: database.password,
		database: database.database
	});

	var self = this;
	EE.call(self);
	mysql.connect();

	setInterval(function ()
	{
		self.emit("GetStats");
	}, interval * 60000);

	self.updateDatabase = function (messagesSent, usersOnline)
	{
		var now = new Date();

		var yyyy = now.getFullYear().toString();
		var mm = (now.getMonth() + 1).toString(); // getMonth() is zero-based
		var dd = now.getDate().toString();
		var date = yyyy + "-" + (mm[1] ? mm : "0" + mm[0]) + "-" + (dd[1] ? dd : "0" + dd[0]);
		var time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();

		var dateTime = date + " " + time;
		var query = "INSERT INTO main.statscord (time, messages, usersonline, date) VALUES ('" + now.getTime() + "', '" + messagesSent + "', '" + usersOnline + "', '" + dateTime + "');";

		mysql.query(query, function (err, rows, fields)
		{
			if (err)
			{
				self.emit("error", err);
			}
		});
	};

	return self;
}

util.inherits(Statscord, EE);
module.exports = Statscord;