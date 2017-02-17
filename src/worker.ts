declare function postMessage(message: any): void;

function fib(num: number): number {
    if(num <= 2) {
        return 1;
    }
    return fib(num - 1) + fib(num - 2);
}

onmessage = function (event: MessageEvent) {
    const num = event.data;
    const result = fib(num);
    postMessage({ number: num, fib: result });
};
