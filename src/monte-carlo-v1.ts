import * as _ from "lodash";
import Random from "simjs-random";

/* tslint:disable:no-var-requires */

export interface IProject {
    startYear: number;
    totalAmount: number;
}

interface IBucketValue {
    group: string;
    value: number;
}

class Groups {
    constructor(private _groups: Group[]) {
    }

    public get groups(): Group[] {
        return _.filter(this._groups, group => group.values.length > 0);
    }

    public set totalNumberOfValues(count: number) {
        this._groups.forEach(group => group.totalNumberOfValues = count);
    }

    public groupForValue(value: number): Group {
        return this._groups.find(group => (typeof group.from === "undefined" || group.from <= value) && (typeof group.to === "undefined" || group.to > value))!;
    }
}

class Group {
    public separator = false;
    public values: number[] = [];
    public totalNumberOfValues = 1;
    public from?: number;
    public to?: number;

    constructor(public name: string, public description: string) {}

    addValue(value: number) {
        this.values.push(value);
    }

    public get percentage() {
        return this.values.length / (this.totalNumberOfValues || 1);
    }
}

export interface IProjectResult {
    buckets: IBucketValue[][];

    groups: Groups;

    /**
     * The project
     */
    project: IProject;
}

interface IMonteCarloSimulation {
    investmentAmount: number;
    liquidity: number;
    noInterestReferenceLine: number[];
    numRuns: number;
    numYears: number;
    projectsByStartYear: _.Dictionary<IProject[]>;
    simulatedValues: number[][];
}

export interface IMonteCarloSimulationOptions {
    numYears?: number;
    numRuns?: number;
    projects?: IProject[];
    investmentAmount?: number;
    performance?: number;
    seed?: number;
    volatility: number;
    liquidity?: number;
}

interface IInitializedMonteCarloSimulationOptions {
    numYears: number;
    numRuns: number;
    projects: IProject[];
    investmentAmount: number;
    performance: number;
    seed?: number;
    volatility: number;
    liquidity: number;
}

function initializeOptions(options?: IMonteCarloSimulationOptions): IInitializedMonteCarloSimulationOptions {
    return Object.assign({}, {
        investmentAmount: 1000000,
        liquidity: 10000,
        numRuns: 10000,
        numYears: 10,
        performance: 0,
        projects: [],
        seed: undefined,
        volatility: 0.01
    }, options);
}

function simulate(options: IInitializedMonteCarloSimulationOptions): IMonteCarloSimulation {
    const random = new Random(options.seed);

    /**
     * Performs the monte carlo simulation for all years and num runs.
     * @param cashFlows the cash flows
     * @returns {number[][]} the simulated outcomes grouped by year
     */
    function simulateOutcomes(cashFlows: number[]): number[][]  {
        function toAbsoluteIndices(indices: number[]) {
            let currentPortfolioValue = options.investmentAmount;
            let previousYearIndex = 100;

            for (let relativeYear = 0; relativeYear < indices.length; ++relativeYear) {
                const currentYearIndex = indices[relativeYear];
                const cashFlowStartOfYear = relativeYear === 0 ? 0 : cashFlows[relativeYear - 1];

                // scale current value with performance gain according to index
                const performance = currentYearIndex / previousYearIndex;
                currentPortfolioValue = (currentPortfolioValue + cashFlowStartOfYear) * performance;

                indices[relativeYear] = Math.round(currentPortfolioValue);
                previousYearIndex = currentYearIndex;
            }

            return indices;
        }

        const result: number[][] = new Array(options.numYears);
        for (let run = 0; run < options.numRuns; run++) {
            const indices = [100];

            for (let i = 1; i <= options.numYears; i++) {
                const randomPerformance = 1 + random.normal(options.performance, options.volatility);
                indices.push(indices[i - 1] * randomPerformance);
            }

            // convert the relative values from above to absolute values.
            toAbsoluteIndices(indices);

            for (let year = 0; year < indices.length; ++year) {
                result[year] = result[year] || [];
                result[year].push(indices[year]);
            }
        }

        return result;
    }

    function projectsToCashFlows() {
        const cashFlows: number[] = [];
        for (let year = 0; year < options.numYears; ++year) {
            const projectsByThisYear = projectsByStartYear[year] || [];
            const cashFlow = -projectsByThisYear.reduce((memo, project) => memo + project.totalAmount, 0);
            cashFlows.push(cashFlow);
        }
        return cashFlows;
    }

    function calculateNoInterestReferenceLine(cashFlows: number[]) {
        const noInterestReferenceLine: number[] = [];

        let investmentAmountLeft = options.investmentAmount;
        for (let year = 0; year < options.numYears; ++year) {
            investmentAmountLeft = investmentAmountLeft + cashFlows[year];
            noInterestReferenceLine.push(investmentAmountLeft);
        }
        return noInterestReferenceLine;
    }

    const projects = options.projects.sort((a, b) => a.startYear - b.startYear);

    // Group projects by startYear, use lodash groupBy instead
    const projectsByStartYear: _.Dictionary<IProject[]> = {};
    for (let i = 0; i < projects.length; ++i) {
        const project = projects[i];
        const arr = projectsByStartYear[project.startYear] = projectsByStartYear[project.startYear] || [];
        arr.push(project);
    }

    const cashFlows = projectsToCashFlows();
    const noInterestReferenceLine = calculateNoInterestReferenceLine(cashFlows);

    return {
        investmentAmount: options.investmentAmount,
        liquidity: options.liquidity,
        noInterestReferenceLine,
        numRuns: options.numRuns,
        numYears: options.numYears,
        projectsByStartYear,
        simulatedValues: simulateOutcomes(cashFlows)
    };
}

function calculateProject(project: IProject, { noInterestReferenceLine, simulatedValues, liquidity, projectsByStartYear }: IMonteCarloSimulation): IProjectResult {
    const NUMBER_OF_BUCKETS = 10;

    function createGroups(requiredAmount: number, noInterestReference: number): Groups {
        const green = new Group("green", "Ziel erreichbar");
        green.from = requiredAmount;
        green.separator = true;

        const yellow = new Group("yellow", "mit Zusatzliquidität erreichbar");
        yellow.from = requiredAmount - liquidity;
        yellow.to = requiredAmount;
        yellow.separator = true;

        const gray = new Group("gray", "nicht erreichbar");
        gray.from = noInterestReference;
        gray.to = requiredAmount - liquidity;

        const red = new Group("red", "nicht erreichbar, mit Verlust");
        red.to = noInterestReference;
        return new Groups([green, yellow, gray, red]);
    }

    function calculateRequiredAmount() {
        let amount = project.totalAmount;
        const projectsSameYear = projectsByStartYear[project.startYear];

        for (let i = 0; i < projectsSameYear.length; ++i) {
            const otherProject = projectsSameYear[i];
            if (otherProject === project) {
                break;
            }
            amount += otherProject.totalAmount;
        }
        return amount;
    }

    const requiredAmount = calculateRequiredAmount();
    const simulatedValuesThisYear = simulatedValues[project.startYear];
    simulatedValuesThisYear.sort((a, b) => a - b);

    const groups = createGroups(requiredAmount, noInterestReferenceLine[project.startYear]);
    groups.totalNumberOfValues = simulatedValues.length;

    const valuesByGroup: { [groupName: string]: number } = {};
    const bucketSize = Math.round(simulatedValuesThisYear.length / NUMBER_OF_BUCKETS);
    const buckets: IBucketValue[][] = [];

    for (let i = 0; i < simulatedValuesThisYear.length; i += bucketSize) {
        const bucket = [];

        for (let j = i; j < i + bucketSize; ++j) {
            const value = simulatedValuesThisYear[j];

            const group = groups.groupForValue(simulatedValuesThisYear[j]);
            valuesByGroup[group.name] = (valuesByGroup[group.name] || 0) + 1;
            bucket.push({ group: group.name, value });
        }

        buckets.push(bucket);
    }


    // empty groups are returned
    // min, max, percentage and median, twoThird has to be calculated by the chart
    return {
        buckets,
        groups: groups,
        project
    };
}

export function syncMonteCarlo(options?: IMonteCarloSimulationOptions) {
    const simulation = simulate(initializeOptions(options));
    let projects: IProjectResult[] = [];
    for (const project of options!.projects!) {
        projects.push(calculateProject(project, simulation));
    }

    return projects;
}
