/**
 * Created by bq on 2015-11-20.
 */

/*
 *  reminder format
 *  Date.now()
 *  message: message,
 *
 */
(function ()
{
	var fs = require('fs'),
	    _  = require('underscore');

	var path                   = 'reminders.json',
	    reminders              = {},
	    checkIntervalInMinutes = 1;

	LoadReminders();

	module.exports.NewReminder = function (data)
	{
		var rem = {
			'userID':  data.userID,
			'message': data.message,
			'created': data.created,
			'date':    data.date
		};

		reminders[data.time] = rem;
	};

	setInterval(function ()
	{
		//CheckReminders();
	}, checkIntervalInMinutes * 60 * 1000);

	function LoadReminders ()
	{
		fs.readFile(path, function (err, data)
		{
			if (!err)
			{
				reminders = JSON.parse(data);
				//console.log("Successfully loaded " + path);
			}
			else
			{
				console.log(err);
			}
		});
	}

	function SaveReminders ()
	{
		fs.writeFile(path, JSON.stringify(reminders));
	}
}());