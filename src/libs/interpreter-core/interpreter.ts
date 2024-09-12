export type instructionPieceType = {
    opcode: number,
    operand: number
}

// instruction codes <4-bit classification code><4-bit instruction code>
// Mnemonic for data move 
export const MNEMONIC_DATA_MOVE = {
    "LDM": 0b00000000,  // Load the number into ACC (immediate addressing)
    "LDD": 0b00000001,  // Load the contents of the specified address into ACC (direct/absolute addressing)
    "LDI": 0b00000010,  // Load the contents of the contents of the given address into ACC (indirect addressing)
    "LDX": 0b00000011,  // Load the contents of the calculated address into ACC (indexed addressing)
    "LDR": 0b00000100,  // Load the number into IX (immediate addressing) or ACC into IX
    "MOV": 0b00000101,  // Move the contents of ACC to IX
    "STO": 0b00000110,  // Store the contents of ACC into the specified address (direct/absolute addressing)
    "END": 0b00000111   // Return control to the operating system
};

// Mnemonic for IO
export const MNEMONIC_IO = {
    "IN":   0b00010000,   // Key in a character and store its ASCII value in ACC
    "OUT":  0b00010001   // Output to the screen the character whose ASCII value is stored in ACC
};

// Mnemonic for arithmetic
export const MNEMONIC_ARITHMETIC = {
    "ADD_ADDRESS":      0b00100000,  // Add the contents of the specified address to ACC (direct/absolute addressing)
    "ADD_IMMEDIATE":    0b00100001,  // Add the denary number n to ACC (immediate addressing)
    "SUB_ADDRESS":      0b00100010,  // Subtract the contents of the specified address from ACC
    "SUB_IMMEDIATE":    0b00100011,  // Subtract the number n from ACC (immediate addressing)
    "INC":              0b00100100,  // Add 1 to the contents of the register (ACC or IX)
    "DEC":              0b00100101   // Subtract 1 from the contents of the register (ACC or IX)
};

// Mnemonic for branching
export const MNEMONIC_BRANCHING = {
    "JMP": 0b00110000,  // Jump to the specified address
    "JPE": 0b00110001,  // Jump to the specified address if comparison is True
    "JPN": 0b00110010,  // Jump to the specified address if comparison is False
    "END": 0b00110011   // Return control to the operating system
};

// Mnemonic for comparison
export const MNEMONIC_COMPARE = {
    "CMP_ADDRESS":      0b01000000,  // Compare ACC with contents of the specified address (direct/absolute addressing)
    "CMP_IMMEDIATE":    0b01000001,  // Compare ACC with the number n (immediate addressing)
    "CMI_ADDRESS":      0b01000010   // Compare ACC with contents of the contents of the specified address (indirect addressing)
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
