import register, { type RegisterNameType } from "./register";
import { type instructionPieceType, lookUpMnemonic, MNEMONIC_DATA_MOVE, MNEMONIC_IO, MNEMONIC_ARITHMETIC, MNEMONIC_BRANCHING, MNEMONIC_COMPARE } from "./interpreter";


export const StatusCodes = {
    "C": 0b00000001, // Carry
    "N": 0b00000010, // Negative
    "O": 0b00000100, // Overflow
    "Z": 0b00001000, // Zero
};  

export class machine {
    registers: Record<RegisterNameType, register>;
    private bits: number;
    private memory: Record<number, number> = {};
    private end: boolean = true;
    private inputDevice: () => Promise<number>
    private outputDevice: (value: number) => Promise<void> 
    verbose: boolean = false
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
        value = parseInt(value.toString(2).slice(0, this.bits), 2); // deal with overflow
        this.memory[address] = value;
    }

    readMemory(address: number) {
        return this.memory[address] || 0;
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
            this.storeInstructionInMemory(i*2, instructions[i]);
        }

        this.registers.PC.setVal(0);

        for(let i = 0; i < instructions.length; i++){
            await this.executeInstruction(this.registers.PC.getVal());
            this.logMemoryAndRegisters();
            if(this.verbose) console.log("");
            if(this.end) break;
        }
    }

    logMemoryAndRegisters(){
        if(!this.verbose) return;
        console.log("---MEMORY-BEGIN---")
        Object.keys(this.memory).map(i => parseInt(i)).sort().forEach((index) => {
            console.log(`${index} | ${this.memory[index].toString(2).padStart(this.bits, "0")}`);
        });
        console.log("----MEMORY-END----")

        console.log("--REGISTER-BEGIN--")
        Object.keys(this.registers).forEach((key) => {
            console.log(`${key.padStart(3, " ")}: ${this.registers[key as RegisterNameType].getVal().toString(2).padStart(this.bits, "0")}`);
        })
        console.log("---REGISTER-END---")
    }

    storeInstructionInMemory(address: number, instruction: instructionPieceType) {
        this.memory[address] = instruction.opcode;
        this.memory[address + 1] = instruction.operand;
    }

    private fetchDecodeInstruction(address: number): instructionPieceType {
        if(this.verbose) console.log("Fetching instruction at address", address)
        const decoded: instructionPieceType = {
            opcode: this.memory[address],
            operand: this.memory[address + 1]
        }
        if(this.verbose) console.log(`Decoded: [OPCODE:${lookUpMnemonic(decoded.opcode)}(${decoded.opcode.toString(2).padStart(8, "0")}), OPERAND:${decoded.operand.toString(2).padStart(this.bits, "0")}]`)
        return decoded
    }

    async executeInstruction(address: number) {
        this.end = false;
        const instruction = this.fetchDecodeInstruction(address);
        let flagJumped = false;
        switch(instruction.opcode){
            // Data Move
            case MNEMONIC_DATA_MOVE.LDM: {
                // Load the number into ACC (immediate addressing)
                this.registers.ACC.setVal(instruction.operand);
                break;
            }
            case MNEMONIC_DATA_MOVE.LDD: {
                // Load the contents of the specified address into ACC (direct/absolute addressing)
                this.registers.ACC.setVal(this.readMemory(instruction.operand));
                break;
            }
            case MNEMONIC_DATA_MOVE.LDI: {
                // Load the contents of the contents of the given address into ACC (indirect addressing)
                const location = this.readMemory(instruction.operand);
                this.registers.ACC.setVal(this.readMemory(location));
                break;
            }
            case MNEMONIC_DATA_MOVE.LDX: {
                // Load the contents of the calculated address into ACC (indexed addressing)
                const calculatedAddress = this.registers.ACC.getVal() + this.registers.IX.getVal();
                this.registers.ACC.setVal(this.readMemory(calculatedAddress));
                break;
            }
            case MNEMONIC_DATA_MOVE.LDR: {
                // Load the number into IX (immediate addressing) or ACC into IX
                this.registers.IX.setVal(instruction.operand);
                break;
            }
            case MNEMONIC_DATA_MOVE.MOV: {
                // Move the contents of ACC to IX
                this.registers.IX.setVal(this.registers.ACC.getVal());
                break;
            }
            case MNEMONIC_DATA_MOVE.STO: {
                // Store the contents of ACC into the specified address (direct/absolute addressing)
                this.setMemory(this.registers.MAR.getVal(), this.registers.ACC.getVal());
                break;
            }
            case MNEMONIC_DATA_MOVE.END: {
                // Return control to the operating system
                break;
            }

            // Input/Output
            case MNEMONIC_IO.IN: {
                // Key in a character and store its ASCII value in ACC
                this.registers.ACC.setVal(await this.inputDevice());
                break;
            }
            case MNEMONIC_IO.OUT: {
                // Output to the screen the character whose ASCII value is stored in ACC
                this.outputDevice(this.registers.ACC.getVal());
                break;
            }

            // Arithmetic
            case MNEMONIC_ARITHMETIC.ADD_ADDRESS: {
                // Add the contents of the specified address to ACC (direct/absolute addressing)
                this.registers.ACC.setVal(this.registers.ACC.getVal() + this.readMemory(instruction.operand));
                break;
            }
            case MNEMONIC_ARITHMETIC.ADD_IMMEDIATE: {
                // Add the denary number n to ACC (immediate addressing)
                this.registers.ACC.setVal(this.registers.ACC.getVal() + instruction.operand);
                break;
            }
            case MNEMONIC_ARITHMETIC.SUB_ADDRESS: {
                // Subtract the contents of the specified address from ACC
                this.registers.ACC.setVal(this.registers.ACC.getVal() - this.readMemory(instruction.operand));
                break;
            }
            case MNEMONIC_ARITHMETIC.SUB_IMMEDIATE: {
                // Subtract the number n from ACC (immediate addressing)
                this.registers.ACC.setVal(this.registers.ACC.getVal() - instruction.operand);
                break;
            }

            // Branching
            case MNEMONIC_BRANCHING.JMP: {
                // Jump to the specified address
                flagJumped = true;
                this.registers.PC.setVal(instruction.operand); // reserve one for pc increment
                break;
            }

            case MNEMONIC_BRANCHING.JPE: {
                // Jump to the specified address if comparison is True
                if(this.registers.ACC.getVal() === 0){
                    flagJumped = true;
                    this.registers.PC.setVal(instruction.operand);
                }
                break;
            }

            case MNEMONIC_BRANCHING.JPN: {
                // Jump to the specified address if comparison is False
                if(this.registers.ACC.getVal() !== 0){
                    flagJumped = true;
                    this.registers.PC.setVal(instruction.operand);
                }
                break;
            }

            case MNEMONIC_BRANCHING.END: {
                // Return control to the operating system
                this.end = true;
                break;
            }

            // Comparison
            case MNEMONIC_COMPARE.CMP_ADDRESS: {
                // Compare ACC with contents of the specified address (direct/absolute addressing)
                const val = this.registers.ACC.getVal() - this.readMemory(instruction.operand);
                this.setSPNum(val);
                break;
            }
            case MNEMONIC_COMPARE.CMP_IMMEDIATE: {
                // Compare ACC with the number n (immediate addressing)
                const val = this.registers.ACC.getVal() - instruction.operand;
                this.setSPNum(val);
                break;
            }
            case MNEMONIC_COMPARE.CMI_ADDRESS: {
                // Compare ACC with contents of the contents of the specified address (indirect addressing)
                const val = this.registers.ACC.getVal() - this.readMemory(this.readMemory(instruction.operand));
                this.setSPNum(val);
                break;
            }

            default: {
                throw new Error("Invalid instruction opcode:" + instruction.opcode.toString(16));
            }
        }

        if(!flagJumped){
            this.registers.PC.setVal(this.registers.PC.getVal() + 2);
        }
    }
}

export default machine;
