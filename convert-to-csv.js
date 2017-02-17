const json2csv  = require("json2csv");
const fs = require("fs");
const path = require("path");

const outputs = [];
const fields = [ {
        label: "File",
        value: "file"
    }, {
        label: "Name",
        value: function (row) {
            return row.benchmarks.name.substring(0, row.benchmarks.name.indexOf(":"))
        }
    }, {
        label: "runs",
        value: function (row) {
            const runs = row.benchmarks.name.substring(row.benchmarks.name.indexOf("runs:") + 5, row.benchmarks.name.indexOf(")"));
            return runs.replace(".", "").replace(",", "");
        }
    }, {
        label: "projects", 
        value: function (row) {
            return row.benchmarks.name.substring(row.benchmarks.name.indexOf("projects:") + 9, row.benchmarks.name.indexOf(","));
        }
    },
    {
        label: "Margin of Error",
        value: "benchmarks.stats.moe"
    }, {
        label: "Relative Margin of Error",
        value: "benchmarks.stats.rme"
    }, {
        label: "Standard Error of the mean",
        value: "benchmarks.stats.sem"
    }, {
        label: "Standard Deviation",
        value: "benchmarks.stats.deviation"
    }, {
        label: "Mean (s)",
        value: "benchmarks.stats.mean"
    }, {
        label: "Variance",
        value: "benchmarks.stats.variance"
    }, {
        label: "Time Stamp",
        value: function (row) {
            // http://stackoverflow.com/questions/1703505/excel-date-to-unix-timestamp
            const timestamp = row.benchmarks.times.timeStamp;
            return new Date(timestamp).toISOString().split(".")[0].replace("T", " ");
        }
    }, 
];

for (const file of fs.readdirSync(path.resolve("./"))) {
    if (!file.startsWith("results") || !file.endsWith(".json")) {
        continue;
    }

    const first = outputs.length === 0;

    const fileContent = fs.readFileSync(path.join(__dirname, file), "utf-8");
    const json = { benchmarks: JSON.parse(fileContent) };


    let set = file;
    
    json.file =  file;
    outputs.push(json2csv({ data: json, fields, hasCSVColumnTitle: first, unwindPath: "benchmarks"}));
}

fs.writeFileSync(path.join(__dirname, "benchmarks.csv"), outputs.join("\n"));
