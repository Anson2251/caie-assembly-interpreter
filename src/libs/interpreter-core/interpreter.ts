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
    "IN": 0x10,   // Key in a character and store its ASCII value in ACC
    "OUT": 0x11   // Output to the screen the character whose ASCII value is stored in ACC
};

// Mnemonic for arithmetic
export const MNEMONIC_ARITHMETIC = {
    "ADD_ADDRESS": 0x20,  // Add the contents of the specified address to ACC (direct/absolute addressing)
    "ADD_IMMEDIATE": 0x21,  // Add the denary number n to ACC (immediate addressing)
    "SUB_ADDRESS": 0x22,  // Subtract the contents of the specified address from ACC
    "SUB_IMMEDIATE": 0x23,  // Subtract the number n from ACC (immediate addressing)
    "INC": 0x24,  // Add 1 to the contents of the register (ACC or IX)
    "DEC": 0x25   // Subtract 1 from the contents of the register (ACC or IX)
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
    "CMP_ADDRESS": 0x40,  // Compare ACC with contents of the specified address (direct/absolute addressing)
    "CMP_IMMEDIATE": 0x41,  // Compare ACC with the number n (immediate addressing)
    "CMI": 0x42   // Compare ACC with contents of the contents of the specified address (indirect addressing)
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

/**
 * Assembles the given assembly language code into machine code.
 * 
 * @param code The assembly language code to assemble.
 * @returns The assembled machine code.
 */
export function assembler(code: string) {
    const lines = preprocessCode(code);
    const labels = extractLabels(lines);
    const intermediateCode = parseIntermediateCode(lines);
    const finalCode = generateMachineCode(intermediateCode, labels);

    console.log(finalCode);
    return finalCode;
}

/**
 * Preprocesses the given assembly language code.
 * 
 * @param code The assembly language code to preprocess.
 * @returns The preprocessed code, split into lines and with comments and excess whitespace removed.
 */
function preprocessCode(code: string): string[][] {
    return code.trim().replace("\r", "").split("\n")
        .filter(line => line !== "")  // Ignore empty lines
        .map((line) => line.split(";")[0].trim().replace(/\s+/g, " "))  // Remove comments and excess whitespace
        .map((line) => tokenizeLine(line));
}

/**
 * Tokenizes the given line of assembly language code into an array of at most 3 strings.
 * 
 * @param line The line of assembly language code to tokenize.
 * @returns An array of strings, where the first element is the mnemonic, the second element is the operand, and the third element is the comment. If the line does not contain a comment, the third element is an empty string. If the line does not contain an operand, the second element is an empty string.
 */
function tokenizeLine(line: string): string[] {
    const tokens = line.split(" ").map(token => token.trim());
    return tokens.length > 3 ? tokens.slice(0, 3) : tokens.concat(Array(3 - tokens.length).fill(""));
}

/**
 * Extracts labels from the given assembly language code.
 * 
 * @param lines The preprocessed assembly language code.
 * @returns An array of objects, where each object has a "label" property and an "index" property. The "label" property is the label name, and the "index" property is the index of the instruction that follows the label.
 */
export function extractLabels(lines: string[][]): { label: string, index: number }[] {
    const labels: { label: string, index: number }[] = [];
    let instructionIndex = 0;

    lines.forEach((line) => {
        if (isLabel(line[0])) {
            const label = line[0].slice(0, -1);
            labels.push({ label, index: instructionIndex });
        } else {
            instructionIndex++;
        }
    });

    return labels;
}

/**
 * Checks if the given token is a label.
 * 
 * A label is a token that consists only of letters (a-z or A-Z), and is followed by a colon (:).
 * 
 * @param token The token to check.
 * @returns True if the token is a label, false otherwise.
 */
function isLabel(token: string): boolean {
    return /^[a-zA-Z]+:$/.test(token);
}

/**
 * Parses the given assembly language code into an array of intermediate instructions.
 * 
 * Each intermediate instruction is an object with three properties: "label", "opcode", and "operand".
 * 
 * - `label` property is the label associated with the instruction
 * - `opcode` property is the opcode of the instruction
 * - `operand` property is the operand of the instruction
 * 
 * @param lines The preprocessed assembly language code.
 * @returns An array of intermediate instructions.
 */
function parseIntermediateCode(lines: string[][]): intermediateInstructionType[] {
    const intermediateCode: intermediateInstructionType[] = [];

    for (const line of lines) {
        if (!isLabel(line[0])) {
            line.unshift("");  // If no label, add an empty string to keep line structure consistent
        }

        const instruction: intermediateInstructionType = {
            label: line[0],
            opcode: resolveOpcode(line[1], line[2]),
            operand: parseOperand(line[2])
        };

        intermediateCode.push(instruction);
    }

    return intermediateCode;
}

/**
 * Resolves the given opcode into its full form.
 * 
 * Abbreviated opcodes (CMP, ADD, SUB) are resolved based on the presence of a value prefix
 * in the operand. If the operand contains a value prefix (B, #, &), the opcode is in its
 * immediate form. Otherwise, it is in its address form.
 * 
 * All other opcodes are returned unchanged.
 * 
 * @param opcode The opcode to resolve.
 * @param operand The operand associated with the opcode.
 * @returns The resolved opcode.
 */
function resolveOpcode(opcode: string, operand: string): string {
    const abbreviated = ["CMP", "ADD", "SUB"];
    const valuePrefix = ["B", "#", "&"];

    if (abbreviated.includes(opcode)) {
        return valuePrefix.includes(operand[0]) ? `${opcode}_IMMEDIATE` : `${opcode}_ADDRESS`;
    }

    return opcode;
}

/**
 * Parses the given operand string into a number or label.
 * 
 * If the operand string contains a value prefix (B, #, &), the operand is interpreted
 * as a number in the given base.
 * 
 * If the operand string is a register name, the register's index is returned.
 * 
 * Otherwise, the operand is returned as a string, which may be a label that will be
 * resolved later.
 * 
 * @param operand The operand string to parse.
 * @returns The parsed operand, which may be a number or a string.
 */
function parseOperand(operand: string): number | string {
    const valuePrefix = { "#": 10, "&": 16, "B": 2 };

    if (!operand) return 0;  // Default operand is 0

    const prefix = operand[0];
    if (Object.keys(valuePrefix).includes(prefix)) {
        return parseInt(operand.slice(1), (valuePrefix as any)[prefix]);
    }

    if (RegisterTypes.includes(operand)) {
        return RegisterTypes.indexOf(operand);
    }

    return operand;  // Operand could be a label, which will be resolved later
}

/**
 * Generates machine code from the given intermediate code and labels.
 * 
 * Replaces opcodes with their full form, and resolves any labels in the operand.
 * 
 * @param intermediateCode The intermediate code to generate machine code for.
 * @param labels The labels and their corresponding instruction indices.
 * @returns The generated machine code.
 */
function generateMachineCode(intermediateCode: intermediateInstructionType[], labels: { label: string, index: number }[]): instructionPieceType[] {
    const labelMap = labels.reduce((acc, label) => {
        acc[label.label] = label.index;
        return acc;
    }, {} as Record<string, number>);

    return intermediateCode.map(instruction => {
        const newInstruction: instructionPieceType = {
            opcode: resolveMnemonic(instruction.opcode),
            operand: resolveOperand(instruction.operand, labelMap)
        };
        return newInstruction;
    });
}

/**
 * Resolves the given opcode string into its corresponding machine code value.
 * 
 * If the opcode is found in the ALL_MNEMONICS object, its corresponding machine code value is returned.
 * Otherwise, `0xFF` is returned to indicate an invalid opcode.
 * 
 * @param opcode The opcode string to resolve.
 * @returns The resolved machine code value.
 */
function resolveMnemonic(opcode: string): number {
    return (ALL_MNEMONICS as any)[opcode] !== undefined ? (ALL_MNEMONICS as any)[opcode] : 0xFF;
}

/**
 * Resolves the given operand, which may be a string or a number, into a machine code value.
 * 
 * @param operand The operand to resolve, which may be a string or a number.
 * @param labelMap The label map to look up string operands in.
 * @returns The resolved machine code value.
 */
function resolveOperand(operand: string | number, labelMap: Record<string, number>): number {
    if (typeof operand === "string") {
        if (labelMap[operand] !== undefined) {
            return labelMap[operand];
        } else {
            throw new Error(`Label ${operand} not found`);
        }
    }

    if (typeof operand === "number") {
        return operand;
    }

    throw new Error(`Invalid operand ${operand}`);
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
