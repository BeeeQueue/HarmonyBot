/**
 * Created by bq on 2015-11-20.
 */
"use strict";

/*
 *  reminder format
 *  'userID':  data.userID,
 *  'message': data.message,
 *  'created': data.created,
 *  'date':    data.date
 */
var util  = require("util"),
    MySQL = require("mysql"),
    EE    = require("events").EventEmitter,
    mysql;

require('datejs');
var dateFormat         = "yyyy-MM-dd HH:mm:ss",
    readableDateFormat = "dd MMM 'yy HH:mm";

function RemindMe (database)
{
	mysql = MySQL.createConnection({
		host:               database.host,
		user:               database.user,
		password:           database.password,
		database:           database.database,
		multipleStatements: true
	});
	
	mysql.on('error', function (err)
	{
		console.error(err);
		mysql.connect();
	});

	var self = this;
	EE.call(self);

	setInterval(function ()
	{
		checkReminders();
	}, 10 * 1000);

	self.addReminder = function (data)
	{
		var now     = Date.parse("now").toString(dateFormat),
		    created = now.toString(dateFormat),
		    when    = Date.parse(data.when);

		if (when == null)
		{
			self.emit("message", data.channelID, "http://datejs.com/\nInvalid date input! \nYou can test out the possibilities in the link!");
			return;
		}

		var query = "INSERT INTO " + database.table + " (message, userID, `when`, created) VALUES (" + mysql.escape(data.message) + ", " + data.userID + ", '" + when.toString(dateFormat) + "', '" + created + "');";

		var sql = mysql.query(query, function (err, rows, fields)
		{
			if (err)
			{
				err.query = sql.sql;
				self.emit("error", err);
			}
			else
			{
				self.emit("log", "Unique ID " + rows.insertId);
				self.emit("message", data.channelID, "Okay!\nI will remind you " + when.toString(readableDateFormat) + "!\nYou can cancel this using !cancelreminder " + rows.insertId + "\nAnyone can copy this reminder using !remindmetoo " + rows.insertId);
			}
		});
	};

	self.removeReminder = function (data)
	{
		var uID = !isNaN(data.pars[0]) ? data.pars[0] : null;

		if (uID != null)
		{
			var findingQuery = "SELECT * FROM " + database.table + " WHERE uID=" + uID,
			    removalQuery = "DELETE FROM " + database.table + " WHERE uID=" + uID;

			var sql = mysql.query(findingQuery, function (err, rows, fields)
			{
				if (!err)
				{
					if (rows.length > 0)
					{
						var res = rows[0];

						if (res.userID == data.userID || res.userID == 114667432852979712)
						{
							mysql.query(removalQuery, function (err, rows, fields)
							{
								if (!err && rows.affectedRows > 0)
								{
									self.emit("message", data.channelID, "Cancelled reminder!");
									self.emit("log", data.user + " cancelled " + (data.userID == res.userID ? "their" : "someone else's") + " reminder");
								}
								else
								{
									self.emit("error", err);
									self.emit("message", data.channelID, "ERROR: Couldn't cancel the reminder!");
								}
							});
						}
					}
					else
					{
						self.emit("message", data.channelID, "There is no active reminder with ID " + uID + "!");
					}
				}
				else
				{
					err.query = sql.sql;
					self.emit("error", err);
				}
			});
		}
	};

	self.copyReminder = function (data)
	{
		var query = "CREATE TEMPORARY TABLE tmptable_1 SELECT * FROM " + database.database + "." + database.table + " WHERE uID = '" + data.pars[0] + "';";
		query += "UPDATE tmptable_1 SET uID = NULL;";
		query += "UPDATE tmptable_1 SET userID = '" + data.userID + "';";
		query += "INSERT INTO " + database.database + "." + database.table + " SELECT * FROM tmptable_1;";
		query += "DROP TEMPORARY TABLE IF EXISTS tmptable_1;";

		var sql = mysql.query(query, function (err, results, fields)
		{
			if (!err)
			{
				if (results[3])
					self.emit("message", data.userID, "Okay, I will remind you too!\n");
				else
					self.emit("a");
			}
			else
			{
				err.query = sql.sql;
				self.emit("error", err);
			}
		});
	};

	function checkReminders ()
	{
		// Message if passed
		var findQuery    = "SELECT * FROM " + database.table + " WHERE active=1",
		    disableQuery = "UPDATE " + database.table + " SET active=0 WHERE uID=";

		var sql = mysql.query(findQuery, function (err, rows, fields)
		{
			if (!err && rows.length > 0)
			{
				for (var i = 0; i < rows.length; i++)
				{
					var row = rows[i];

					if (Date.compare(row.when, Date.parse("now")) === -1)
					{
						sql = mysql.query(disableQuery + row.uID, function (err, rows)
						{
							if (!err)
							{
								self.emit("message", row.userID, "RemindMe calling!\nThis is the message you left for yourself:\n\"" + row.message + "\"");
							}
							else
							{
								err.query = sql.sql;
								self.emit("error", err);
							}
						});
					}
				}
			}
			else
			{
				if (err)
				{
					err.query = sql.sql;
					self.emit("error", err);
				}
			}
		});
	}

	checkReminders();

	return self;
}

util.inherits(RemindMe, EE);
module.exports = RemindMe;