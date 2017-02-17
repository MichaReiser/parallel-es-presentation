import * as _ from "lodash";
import * as benchmark from "benchmark";

import {syncMonteCarlo as simJsMonteCarlo, parallelMonteCarlo as simJsParallelMonteCarlo} from "./transpiled/monte-carlo";
import {IMonteCarloSimulationOptions, parallelMonteCarlo as randomParallelMonteCarlo, IProject} from "./dynamic/monte-carlo";
import {syncMonteCarlo as v1MonteCarlo} from "./monte-carlo-v1";
import {syncMonteCarlo as v2MonteCarlo} from "./monte-carlo-v2";
import {syncMonteCarlo as v3MonteCarlo} from "./monte-carlo-v3";
import {syncMonteCarlo as v4MonteCarlo} from "./monte-carlo-v4";
import {syncMonteCarlo as v5MonteCarlo} from "./monte-carlo-v5";
import {syncMonteCarlo as v6MonteCarlo} from "./monte-carlo-v6";
import {syncMonteCarlo as v7MonteCarlo} from "./monte-carlo-v7";

let Benchmark = (benchmark as any).runInContext({ _ });
(window as any).Benchmark = Benchmark;

const runButton = document.querySelector("#run") as HTMLInputElement;
const outputTable = document.querySelector("#output-table") as HTMLTableElement;
const jsonOutputField = document.querySelector("#json-output") as HTMLElement;

type Deferred = { resolve: () => void };

function addAsyncTest(suite: benchmark.Suite, optionsOrTitle: string | (benchmark.Options & { fn: (this: undefined) => PromiseLike<any> }), fn?: ((this: undefined) => PromiseLike<any>)) {
    const options: benchmark.Options = typeof(optionsOrTitle) === "string" ? { name: optionsOrTitle, fn} : optionsOrTitle;
    const asyncFn = options.fn as Function;

    options.defer = true;
    options.fn = function (this: benchmark, deferred: Deferred) {
        const benchmark = this;
        asyncFn.apply(undefined, [])
            .then(function () { deferred.resolve() },
                function (error: any) {
                    console.error(error);
                    benchmark.error = error;
                    deferred.resolve();
                }
            );
    };

    return suite.add(options);
}

function addMonteCarloTest(suite: benchmark.Suite, options: IMonteCarloSimulationOptions & {numberOfProjects: number, numRuns: number}) {
    const runOptions = _.extend(options, {
        projects: createProjects(options.numberOfProjects)
    });

    const configName = `(projects: ${options.numberOfProjects}, runs: ${options.numRuns.toLocaleString()})`;

    suite.add(`v1: Monte Carlo simjs ${configName}`, function () {
        v1MonteCarlo(options);
    });

    suite.add(`v2: Monte Carlo simjs ${configName}`, function () {
        v2MonteCarlo(options);
    });

    suite.add(`v3: Monte Carlo simjs ${configName}`, function () {
        v3MonteCarlo(options);
    });

    suite.add(`v4: Monte Carlo simjs ${configName}`, function () {
        v4MonteCarlo(options);
    });

    suite.add(`v5: Monte Carlo simjs ${configName}`, function () {
        v5MonteCarlo(options);
    });

    suite.add(`v6: Monte Carlo simjs ${configName}`, function () {
        v6MonteCarlo(options);
    });

    suite.add(`v7: Monte Carlo simjs ${configName}`, function () {
        v7MonteCarlo(options);
    });

    suite.add(`final: Monte Carlo simjs ${configName}`, function () {
        simJsMonteCarlo(options);
    });
    addAsyncTest(suite, `dynamic: Monte Carlo Math.random ${configName}`, () => randomParallelMonteCarlo(runOptions));
    addAsyncTest(suite, `transpiled: Monte Carlo simjs ${configName}`, () => simJsParallelMonteCarlo(runOptions));
}

function addMonteCarloTests(suite: benchmark.Suite) {
    const monteCarloOptions = {
        investmentAmount: 620000,
        numYears: 15,
        performance: 0.0340000,
        seed: 10,
        volatility: 0.0896000
    };

    const runs = [10**4, 10**5];
    for (const numRuns of runs) {
        for (const numberOfProjects of  [1, 4, 8, 16]) {
            const options = _.extend({}, monteCarloOptions, { numberOfProjects, numRuns });
            addMonteCarloTest(suite, options);
        }
    }
}

function measure() {
    const suite = new Benchmark.Suite();
    addMonteCarloTests(suite);

    suite.forEach((benchmark: benchmark) => {
        const index = suite.indexOf(benchmark);
        benchmark.on("cycle", () => appendTestResults(benchmark, index));
    });

    suite.on("cycle", function (event: benchmark.Event) {
        const benchmark = event.target as (benchmark);
        const index = (event.currentTarget as Array<benchmark>).indexOf(benchmark);
        appendTestResults(benchmark, index);
    });

    suite.on("complete", function (event: benchmark.Event) {
        const benchmarks = (event.currentTarget as benchmark.Suite).map((benchmark: benchmark & {name: string }) => {
            return {
                info: benchmark.toString,
                name: benchmark.name,
                stats: benchmark.stats,
                times: benchmark.times
            };
        });

        jsonOutputField.textContent = JSON.stringify(benchmarks, undefined, "    ");

        runButton.disabled = false;
    });

    suite.on("start", initResultTable);

    suite.run({async: true });
}

runButton.addEventListener("click", function (event: MouseEvent) {
    event.preventDefault();
    runButton.disabled = true;
    measure();
});

function initResultTable(event: benchmark.Event) {
    clearOutputTable();

    function clearOutputTable() {
        while (outputTable.tBodies.length > 0) {
            outputTable.removeChild(outputTable.tBodies[0]);
        }
    }

    const body = outputTable.createTBody();
    (event.currentTarget as Array<benchmark.Options>).forEach(suite => {
        const row = body.insertRow();
        const [set, ...nameParts] = suite.name!.split(":");

        row.insertCell().textContent = set;
        row.insertCell().textContent = nameParts.join(":");
        const columns = (outputTable.tHead.rows[0] as HTMLTableRowElement).cells.length;
        for (let i = 0; i < columns; ++i) {
            row.insertCell();
        }
    });
}

function appendTestResults(benchmark: benchmark, index: number) {
    const body = outputTable.tBodies[0] as HTMLTableSectionElement;
    const row = body.rows[index] as HTMLTableRowElement;

    row.cells[2].textContent = benchmark.stats.deviation.toFixed(4);
    row.cells[3].textContent = benchmark.stats.mean.toFixed(4);
    row.cells[4].textContent = benchmark.stats.moe.toFixed(4);
    row.cells[5].textContent = benchmark.stats.rme.toFixed(4);
    row.cells[6].textContent = benchmark.stats.sem.toFixed(4);
    row.cells[7].textContent = benchmark.stats.variance.toFixed(4);
    row.cells[8].textContent = benchmark.stats.sample.length.toFixed(0);
    row.cells[9].textContent = benchmark.hz.toFixed(4);
}

function createProjects(count: number): IProject[] {
    const projects: IProject[] = [];

    for (let i = 0; i < count; ++i) {
        projects.push({
            startYear: Math.max(15 - i, 1), // 15 is the number of years... Reverse so that even the tests with only one project has to run the full simulation
            totalAmount: Math.round(Math.random() * 100000)
        });
    }

    return projects;
}
