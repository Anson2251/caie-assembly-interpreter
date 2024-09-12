import register, { type RegisterNameType } from "./register";
import { type instructionPieceType,MNEMONIC_DATA_MOVE, MNEMONIC_IO, MNEMONIC_ARITHMETIC, MNEMONIC_BRANCHING, MNEMONIC_COMPARE } from "./interpreter";


export const StatusCodes = {
    "C": 0b00000001, // Carry
    "N": 0b00000010, // Negative
    "O": 0b00000100, // Overflow
    "Z": 0b00001000, // Zero
};  

export class machine {
    private registers: Record<RegisterNameType, register>;
    private bits: number;
    private memory: Record<number, number> = {};
    private end: boolean = true;
    private inputDevice: () => Promise<number>
    private outputDevice: (value: number) => Promise<void> 
    private sp: {
        /** Carry */
        c: number,
        /** Negative */
        n: number,
        /** Overflow */
        o: number,
        /** Zero */
        z: number
    }
    constructor(bits: number = 16) {
        if(bits < 8){
            throw new Error("Bits must be greater than 8");
        }
        this.registers = {
            "ACC": new register("ACC", bits),
            "IX": new register("IX", bits),
            "CIR": new register("CIR", bits),
            "MAR": new register("MAR", bits),
            "MDR": new register("MDR", bits),
            "PC": new register("PC", bits),
        }
        this.bits = bits;

        this.sp = {
            c: 0,
            n: 0,
            o: 0,
            z: 0
        }

        this.inputDevice = async () => {
            throw new Error("No input device");
        }

        this.outputDevice = async (value: number) => {
            console.error("No output device", value);
        }
    }

    addDevice(type: "input", device: () => Promise<number>): void
    addDevice(type: "output", device: (value: number) => Promise<void>): void
    addDevice(type: "input" | "output", device: any) {
        if(type === "input"){
            this.inputDevice = device;
        }
        if(type === "output"){
            this.outputDevice = device;
        }
    }

    setMemory(address: number, value: number) {
        value = parseInt(value.toString(2).slice(0, this.bits), 2);
        this.memory[address] = value;
    }

    readMemory(address: number) {
        return this.memory[address];
    }

    private setSP(field: keyof typeof this.sp, val: number) {
        this.sp[field] = val;
    }
    
    private setSPNum(val: number){
        if(val === 0){
            this.setSP("c", 0);
            this.setSP("n", 0);
            this.setSP("z", 1);
        } else if(val < 0){
            this.setSP("c", 1);
            this.setSP("n", 1);
            this.setSP("z", 0);
        } else if(val > 0){
            this.setSP("c", 0);
            this.setSP("n", 0);
            this.setSP("z", 0);
        }
    }

    async execute(instructions: instructionPieceType[]) {
        for(let i = 0; i < instructions.length; i++){
            this.writeInstruction(i, instructions[i]);
        }

        this.registers.PC.setVal(0);

        for(let i = 0; i < instructions.length; i++){
            await this.executeInstruction(this.registers.PC.getVal());
            this.dump();
            console.log("-------------------------------");
            if(this.end) break;
            this.registers.PC.setVal(this.registers.PC.getVal() + 1);
        }
    }

    dump(){
        console.log("---DUMP-BEGIN---")
        Object.keys(this.memory).map(i => parseInt(i)).sort().forEach((index) => {
            console.log(index, this.memory[index].toString(2).padStart(16, "0"));
        });

        Object.keys(this.registers).forEach((key) => {
            console.log(key, this.registers[key as RegisterNameType].getVal().toString(2).padStart(this.bits, "0"));
        })
        console.log("---DUMP-END---")
    }

    writeInstruction(address: number, instruction: instructionPieceType){
        this.memory[address] = parseInt(instruction.opcode.toString(2).padStart(8, "0") + instruction.operand.toString(2).padStart(this.bits, "0"), 2);
        console.log(instruction.opcode.toString(2).padStart(8, "0") + instruction.operand.toString(2).padStart(this.bits, "0"))
    }

    private fetchDecodeInstruction(address: number): instructionPieceType {
        console.log("Fetching", address)
        const instruction = this.readMemory(address).toString(2).padStart(8 + this.bits, "0");
        console.log("Decoding", instruction)
        const decoded: instructionPieceType = {
            opcode: parseInt(instruction.slice(0, 8), 2),
            operand: parseInt(instruction.slice(8, 8 + this.bits), 2),
        }
        return decoded
    }

    async executeInstruction(address: number) {
        this.end = false;
        const instruction = this.fetchDecodeInstruction(address);
        console.log(instruction);
        switch(instruction.opcode){
            case MNEMONIC_DATA_MOVE.LDM: {
                this.registers.ACC.setVal(instruction.operand);
                break;
            }
            case MNEMONIC_DATA_MOVE.LDD: {
                this.registers.ACC.setVal(this.readMemory(instruction.operand));
                break;
            }
            case MNEMONIC_DATA_MOVE.LDI: {
                const location = this.readMemory(instruction.operand);
                this.registers.ACC.setVal(this.readMemory(location));
                break;
            }
            case MNEMONIC_DATA_MOVE.LDX: {
                const calculatedAddress = this.registers.ACC.getVal() + this.registers.IX.getVal();
                this.registers.ACC.setVal(this.readMemory(calculatedAddress));
                break;
            }
            case MNEMONIC_DATA_MOVE.LDR: {
                this.registers.IX.setVal(instruction.operand);
                break;
            }
            case MNEMONIC_DATA_MOVE.MOV: {
                this.registers.IX.setVal(this.registers.ACC.getVal());
                break;
            }
            case MNEMONIC_DATA_MOVE.STO: {
                this.setMemory(this.registers.MAR.getVal(), this.registers.ACC.getVal());
                break;
            }
            case MNEMONIC_DATA_MOVE.END: {
                break;
            }

            case MNEMONIC_IO.IN: {
                this.registers.ACC.setVal(await this.inputDevice());
                break;
            }
            case MNEMONIC_IO.OUT: {
                this.outputDevice(this.registers.ACC.getVal());
                break;
            }

            case MNEMONIC_ARITHMETIC.ADD_ADDRESS: {
                this.registers.ACC.setVal(this.registers.ACC.getVal() + this.readMemory(instruction.operand));
                break;
            }
            case MNEMONIC_ARITHMETIC.ADD_IMMEDIATE: {
                this.registers.ACC.setVal(this.registers.ACC.getVal() + instruction.operand);
                break;
            }
            case MNEMONIC_ARITHMETIC.SUB_ADDRESS: {
                this.registers.ACC.setVal(this.registers.ACC.getVal() - this.readMemory(instruction.operand));
                break;
            }
            case MNEMONIC_ARITHMETIC.SUB_IMMEDIATE: {
                this.registers.ACC.setVal(this.registers.ACC.getVal() - instruction.operand);
                break;
            }

            case MNEMONIC_BRANCHING.JMP: {
                this.registers.PC.setVal(instruction.operand-1); // reserve one for pc increment
                break;
            }

            case MNEMONIC_BRANCHING.JPE: {
                if(this.registers.ACC.getVal() === 0){
                    this.registers.PC.setVal(instruction.operand-1);
                }
                break;
            }

            case MNEMONIC_BRANCHING.JPN: {
                if(this.registers.ACC.getVal() !== 0){
                    this.registers.PC.setVal(instruction.operand-1);
                }
                break;
            }

            case MNEMONIC_BRANCHING.END: {
                this.end = true;
                break;
            }

            case MNEMONIC_COMPARE.CMP_ADDRESS: {
                const val = this.registers.ACC.getVal() - this.readMemory(instruction.operand);
                this.setSPNum(val);
                break;
            }
            case MNEMONIC_COMPARE.CMP_IMMEDIATE: {
                const val = this.registers.ACC.getVal() - instruction.operand;
                this.setSPNum(val);
                break;
            }
            case MNEMONIC_COMPARE.CMI_ADDRESS: {
                const val = this.registers.ACC.getVal() - this.readMemory(this.readMemory(instruction.operand));
                this.setSPNum(val);
                break;
            }

            default:
                throw new Error("Invalid instruction");
        }
    }
}

export default machine;
