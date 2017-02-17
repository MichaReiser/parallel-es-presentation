import {syncMonteCarlo, parallelMonteCarlo as transpiledParallelMonteCarlo} from "./transpiled/monte-carlo";
import {parallelMonteCarlo as dynamicParallelMonteCarlo, IProjectResult} from "./dynamic/monte-carlo";
import {syncMonteCarlo as v1MonteCarlo} from "./monte-carlo-v1";
import {fibInWorker} from "./web-worker-example";

/* tslint:disable:no-console */

const monteCarloOptions = {
    investmentAmount: 620000,
    numRuns: 100000,
    numYears: 15,
    performance: 0.0340000,
    projects: [
        {
            startYear: 0,
            totalAmount: 10000
        }, {
            startYear: 1,
            totalAmount: 10000
        }, {
            startYear: 2,
            totalAmount: 10000
        }, {
            startYear: 5,
            totalAmount: 50000
        }, {
            startYear: 15,
            totalAmount: 800000
        }
    ],
    seed: 10,
    volatility: 0.0896000
};
const monteCarloTable = document.querySelector("#montecarlo-table") as HTMLTableElement;

document.querySelector("#montecarlo-run")!.addEventListener("click", function () {
    const selectedVersion = (document.querySelector("input[name='version']:checked") as HTMLInputElement).value;

    console.time(`montecarlo ${selectedVersion}`);
    let promise: PromiseLike<any[]>;
    switch (selectedVersion) {
        case "1":
            promise = Promise.resolve(v1MonteCarlo(monteCarloOptions));
            break;
        case "final":
            promise = Promise.resolve(syncMonteCarlo(monteCarloOptions));
            break;
        case "dynamic":
            promise = dynamicParallelMonteCarlo(monteCarloOptions);
            break;
        case "transpiled":
            promise = transpiledParallelMonteCarlo(monteCarloOptions);
            break;
        default:
            throw new Error(`Unknown version ${selectedVersion}`);
    }

    promise.then(result => {
        console.timeEnd(`montecarlo ${selectedVersion}`);
        console.log(result);

        if (result.length > 0 && result[0].min) {
            paintMonteCarloResult(result as IProjectResult[]);
        }
    });
});

function paintMonteCarloResult(results: IProjectResult[]) {
    while (monteCarloTable.rows.length > 1) {
        monteCarloTable.deleteRow(1);
    }

    for (const result of results) {
        const row = monteCarloTable.insertRow();
        row.insertCell().innerText = result.project.startYear.toLocaleString();
        row.insertCell().innerText = result.project.totalAmount.toLocaleString();

        for (const groupName of ["green", "yellow", "gray", "red"]) {
            const group = result.groups.find(g => g.name === groupName);
            row.insertCell().innerText = group ? (group.percentage * 100).toFixed(2) : "-";
        }
    }
}

document.querySelector("#fibonacci-run")!.addEventListener("click", function () {
    fibInWorker(40);
});
