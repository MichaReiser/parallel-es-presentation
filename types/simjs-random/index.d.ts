declare module "simjs-random" {
    export default class Random {
        constructor(seed?: number);
        normal(a: number, b: number): number;
    }
}