import { RegisterTypes } from "./register";

export type instructionPieceType = {
    opcode: number,
    operand: number
}

export type intermediateInstructionType = {
    label: string,
    opcode: string,
    operand: string | number
}


// instruction codes <4-bit classification code><4-bit instruction code>
// Mnemonic for data move 
export const MNEMONIC_DATA_MOVE = {
    "LDM": 0x00,  // Load the number into ACC (immediate addressing)
    "LDD": 0x01,  // Load the contents of the specified address into ACC (direct/absolute addressing)
    "LDI": 0x02,  // Load the contents of the contents of the given address into ACC (indirect addressing)
    "LDX": 0x03,  // Load the contents of the calculated address into ACC (indexed addressing)
    "LDR": 0x04,  // Load the number into IX (immediate addressing) or ACC into IX
    "MOV": 0x05,  // Move the contents of ACC to IX
    "STO": 0x06,  // Store the contents of ACC into the specified address (direct/absolute addressing)
};

// Mnemonic for IO
export const MNEMONIC_IO = {
    "IN":   0x10,   // Key in a character and store its ASCII value in ACC
    "OUT":  0x11   // Output to the screen the character whose ASCII value is stored in ACC
};

// Mnemonic for arithmetic
export const MNEMONIC_ARITHMETIC = {
    "ADD_ADDRESS":      0x20,  // Add the contents of the specified address to ACC (direct/absolute addressing)
    "ADD_IMMEDIATE":    0x21,  // Add the denary number n to ACC (immediate addressing)
    "SUB_ADDRESS":      0x22,  // Subtract the contents of the specified address from ACC
    "SUB_IMMEDIATE":    0x23,  // Subtract the number n from ACC (immediate addressing)
    "INC":              0x24,  // Add 1 to the contents of the register (ACC or IX)
    "DEC":              0x25   // Subtract 1 from the contents of the register (ACC or IX)
};

// Mnemonic for branching
export const MNEMONIC_BRANCHING = {
    "JMP": 0x30,  // Jump to the specified address
    "JPE": 0x31,  // Jump to the specified address if comparison is True
    "JPN": 0x32,  // Jump to the specified address if comparison is False
    "END": 0x33,   // Return control to the operating system
    "JMR": 0x34    // Jump to the address (relative)
};

// Mnemonic for comparison
export const MNEMONIC_COMPARE = {
    "CMP_ADDRESS":      0x40,  // Compare ACC with contents of the specified address (direct/absolute addressing)
    "CMP_IMMEDIATE":    0x41,  // Compare ACC with the number n (immediate addressing)
    "CMI":              0x42   // Compare ACC with contents of the contents of the specified address (indirect addressing)
};

const ALL_MNEMONICS = {
    ...MNEMONIC_DATA_MOVE,
    ...MNEMONIC_IO,
    ...MNEMONIC_ARITHMETIC,
    ...MNEMONIC_BRANCHING,
    ...MNEMONIC_COMPARE
}

export function lookUpMnemonic(opcode: number) {
    return Object.keys(ALL_MNEMONICS).find((key) => (ALL_MNEMONICS as any)[key] === opcode) || "UNKNOWN";
}

export function assembler(code: string) {
    const lines = code.trim().replace("\r", "").split("\n")
        .filter(line => line !== "") // ignore empty line
        .map((line) => line.split(";")[0].trim().replace(/\s+/g, " ")) // remove comments & space
        .map((line) => {
            const newLine = line.split(" ").map(token => token.trim());

            if (newLine.length > 3) {
                return newLine.slice(0, 3);
              }
              
              return newLine.concat(Array(3 - newLine.length).fill(""));
        }); // separate label, opcode & operand
    console.log(lines)

    const labels: {label: string, index: number}[] = [];

    const intermediateCode: intermediateInstructionType[] = [];

    const abbreviated = [ "CMP", "ADD", "SUB" ];
    const valuePrefix = [ "B", "#", "&" ]

    // const intermediateCode = [];
    for (let i = 0; i < lines.length; i++) {
        const instruction: intermediateInstructionType = {
            label: "",
            opcode: "",
            operand: ""
        }

        if(/^[a-zA-z]+:$/.test(lines[i][0])){
            const label = lines[i][0].slice(0, -1);
            labels.push({label: label, index: 0});
        }
        else {
            lines[i].unshift("")
        }

        if(/^[a-zA-z]+$/.test(lines[i][1])){
            if(abbreviated.includes(lines[i][1])){
                if(valuePrefix.includes(lines[i][2][0])){
                    instruction.opcode = `${lines[i][1]}_IMMEDIATE`;
                }
                else {
                    instruction.opcode = `${lines[i][1]}_ADDRESS`;
                }
            }
            else {
                instruction.opcode = lines[i][1]
            }

            if(lines[i][2] && valuePrefix.includes(lines[i][2][0])){
                switch(lines[i][2][0]){
                    case "#":
                        instruction.operand = parseInt(lines[i][2].slice(1), 10)
                        break;
                    case "&":
                        instruction.operand = parseInt(lines[i][2].slice(1), 16)
                        break;
                    case "B":
                        instruction.operand = parseInt(lines[i][2].slice(1), 2)
                        break;
                }
            }
            else {
                if(RegisterTypes.includes(lines[i][2])){
                    instruction.operand = RegisterTypes.indexOf(lines[i][2]);
                }
                else{
                instruction.operand = lines[i][2];
                }
            }
        }

        if(valuePrefix.includes(lines[i][1][0])){
            switch(lines[i][1][0]){
                case "#": {
                    instruction.operand = parseInt(lines[i][1].slice(1), 10)
                    break;
                }
                case "&": {
                    instruction.operand = parseInt(lines[i][1].slice(1), 16)
                    break;
                }
                case "B": {
                    instruction.operand = parseInt(lines[i][1].slice(1), 2)
                    break;
                }
            }  
        }

        if(instruction.operand === "") instruction.operand = 0; // set operand to 0 if not specified

        instruction.label = lines[i][0]
        intermediateCode.push(instruction)
    }

    for(let i  = 0; i < labels.length; i++){
        labels[i].index = intermediateCode.findIndex((instruction) => instruction.label.slice(0, -1) === labels[i].label);
    }

    console.log(labels)


    // LINKING
    const labelList = labels.map((label) => label.label);
    const finalCode = intermediateCode.map((instruction) => {
        const newInstruction: instructionPieceType = {
            opcode: 0,
            operand: 0
        }
        const currentOperand = instruction.operand;

        if(typeof currentOperand === "string" && labelList.includes(currentOperand)){
            const address = labels.find((label) => label.label === instruction.operand)?.index;
            if(address){
                newInstruction.operand = address;
            }
            else {
                throw new Error(`Label ${currentOperand} not found`)
            }
        }
        else {
            if(typeof currentOperand === "number"){
                newInstruction.operand = currentOperand
            }
            else {
                throw new Error(`Invalid operand ${currentOperand}`)
            }
        }
        console.log(instruction)
        const correspondingOpcode = (ALL_MNEMONICS as any)[instruction.opcode];
        newInstruction.opcode = correspondingOpcode !== undefined ? correspondingOpcode : 0xFF;

        return newInstruction
    })

    console.log(finalCode)
}

const code = `
        LDM     #0              ; Load 0 into ACC
        STO     total           ; Store 0 in total
        STO     counter         ; Store 0 in counter
        LDR     #0              ; Set IX to 0

loop:   LDX     number          ; Load the number indexed by IX into ACC
        ADD     total           ; Add total to ACC
        STO     total           ; Store result in total
        INC     IX              ; Add 1 to the contents of IX
        LDD     counter         ; Load counter into ACC
        INC     ACC             ; Add 1 to ACC
        STO     counter         ; Store result in counter
        CMP     #3              ; Compare with 3
        JPN     loop            ; If ACC not equal to 3 then return to start of loop

        END                     ; End of program

number: #5                      ; List of three numbers
        #7
        #3
counter:
total:
`

console.log(assembler(code))
