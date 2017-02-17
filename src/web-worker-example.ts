import parallel from "parallel-es";

function fib(num: number): number {
    if(num <= 2) {
        return 1;
    }
    return fib(num - 1) + fib(num - 2);
}

export function fibInWorker(num: number) {
    parallel.run(fib, num).then(result =>
        console.log(result)
    );



    /*const worker = new (require("worker-loader!./worker")) as Worker;
    worker.postMessage(num);

    worker.addEventListener("message", function (result: MessageEvent) {
        console.log(result.data);
    });*/
}
