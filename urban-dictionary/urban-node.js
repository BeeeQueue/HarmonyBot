/**
 * Created by bq on 2016-01-15.
 */

var http = require("http");

var baseURL = "http://api.urbandictionary.com/v0/define?term=";

(function ()
{
	module.exports.LookUp = function (input, callback)
	{
		var inputSplit = input.split(" "),
		    mod,
		    whichDef   = 0,
		    data;

		if (inputSplit[inputSplit.length - 1][0] === "-")
		{
			mod = inputSplit[inputSplit.length - 1].substr(1);
			input = input.substr(0, input.lastIndexOf(" ")).trim();

			if (!isNaN(mod) && mod !== 0)
			{
				whichDef = (mod - 1 > 0) ? mod - 1 : 0;
			}
			else if (mod === "last")
			{
				whichDef = "last";
			}
			else
			{
				whichDef = 0;
			}
		}

		var inputEncoded = input.replace(/ /g, "+");

		http.get(baseURL + inputEncoded, function (res)
		{
			var response = "";

			res.on("data", function (chunk)
			{
				response += chunk;
			});

			res.on("end", function ()
			{
				data = JSON.parse(response);
				data.whichDef = whichDef;
				data.input = input;
				HandleResponse(data, callback);
			});
		});
	};

	function HandleResponse (data, callback)
	{
		var messageLines = [],
		    message      = "",
		    inputSplit   = data.input.split(" "),
		    whichDef     = data.whichDef,
		    typeOfResult = "top";

		if (data.result_type === "exact")
		{
			if (data.list[whichDef])
			{
				var def = data.list[whichDef];

				if (whichDef === "last" || whichDef === data.list.length)
				{
					whichDef = data.list.length - 1;
					typeOfResult = "worst";
				}
				else if (whichDef !== 0)
				{
					typeOfResult = ordinal_suffix_of(whichDef + 1);
				}

				messageLines.push("``` ```");
				messageLines.push("UrbanDictionary's " + typeOfResult + " definition of `" + data.input + "` out of " + data.list.length + ":");
				messageLines.push("");
				messageLines.push(def.definition.replace(/]/g, "`").replace(/\[/g, "`"));
				messageLines.push("");
				messageLines.push('Example:\n' + def.example);
				messageLines.push("");

				if (data.tags && data.tags.length > 0)
				{
					messageLines.push("Also relevant:");

					var tagMessage = "";

					for (var j = 0; j < 4; j++)
					{
						tagMessage += data.tags[j] + ", ";
					}

					messageLines.push("`" + tagMessage.substr(0, tagMessage.lastIndexOf(",")) + "`");

					messageLines.push("");
				}

				messageLines.push("``` ```");
			}
			else
			{
				messageLines.push("There aren't " + (whichDef + 1) + " definitions of `" + data.input + "`. Baka.");
			}
		}
		else if (data.result_type === "no_results")
		{
			messageLines.push("Could not find any definitions of `" + data.input + "`!");
		}
		else
		{
			console.log(data.result_type);
			messageLines.push("Something happened :(");
			messageLines.push(data.result_type);
		}

		for (var k = 0; k < messageLines.length; k++)
		{
			message += messageLines[k] + "\n";
		}

		callback(message);
	}

	function ordinal_suffix_of (i)
	{
		var j = i % 10,
		    k = i % 100;
		if (j == 1 && k != 11)
		{
			return i + "st";
		}
		if (j == 2 && k != 12)
		{
			return i + "nd";
		}
		if (j == 3 && k != 13)
		{
			return i + "rd";
		}
		return i + "th";
	}
}());