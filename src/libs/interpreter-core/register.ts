export const RegisterTypes = ["ACC", "CIR", "IX", "MAR", "MDR", "PC"];
export type RegisterNameType = "ACC" | "CIR" | "IX" | "MAR" | "MDR" | "PC";

export const getRegID = (reg: RegisterNameType) => {
    return RegisterTypes.indexOf(reg);
}

export const getRegName = (id: number) => {
    if(id < 0 || id > 5) throw new Error("Invalid register ID");
    return RegisterTypes[id];
}

export class register {
    private value: number;
    private type: RegisterNameType;
    private bits: number;
    constructor(type: RegisterNameType, bits: number) {
        this.type = type;
        this.value = 0;
        this.bits = bits;
    }

    setVal(value: number) {
        value = parseInt(value.toString(2).slice(0, this.bits), 2);
        this.value = value;
    }

    getVal() {
        return this.value;
    }

    getType() {
        return this.type;
    }
}

export default register;