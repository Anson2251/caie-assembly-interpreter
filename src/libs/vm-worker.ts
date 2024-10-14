/// THIS FILE SHOULD BE RUN IN WEB WORKER

import { machine } from "@/libs/interpreter-core/src/machine";

let bits = 8;
let getInputMsg = (msg: string) => msg;


const inputDevice = () => {
    return new Promise<number>((resolve) => {
        getInputMsg = (msg: string) => {
            getInputMsg = (msg1: string) => msg1;
            resolve(parseInt(msg));
            return msg;
        }
        self.postMessage({ action: "input" });
    })
}
const outputDevice = async (value: number) => {
    const sign = value < 0 ? "-" : "";
    const newMsg = `(0x${sign}${Math.abs(value).toString(16).padStart(Math.ceil(bits / 4), "0")}, ${value.toString(10)}, 0b${sign}${Math.abs(value).toString(2).padStart(bits, "0")}, CHAR: "${String.fromCharCode(value)}")`;
    self.postMessage({ action: "output", msg: newMsg });
}

self.onmessage = async (e) => {
    if(e.data.action  === "run"){
        bits = e.data.bits;
        const { code, verbose } = e.data;
        if(bits < 8) throw new Error("Bits must be greater than 8");
        const vm = new machine(bits);

        vm.addDevice("input", inputDevice);
        vm.addDevice("output", outputDevice);
        
        vm.verbose = verbose;
        await vm.execute(code);
        self.postMessage({
            action: "stop"
        });
    }
    if(e.data.action === "input-reply"){
        getInputMsg(e.data.msg);
    }
}