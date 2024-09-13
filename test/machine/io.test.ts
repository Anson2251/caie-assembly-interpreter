import { suite, it, expect } from 'vitest'
import machine from "@/libs/interpreter-core/machine"

suite('Interpreter-Core-Machine - IO Instructions', () => {
    it('should be able to accept input and output the input value', async () => {
        const vm = new machine(16);

        let output = 0;

        vm.addDevice('output', async (value: number) => {
            output = value;
        });

        vm.addDevice('input', async () => {
            return 15;
        });

        vm.verbose = false;

        const instructions = [
            { opcode: 0b00010000, operand: 0b00000000 }, // IN
            { opcode: 0b00010001, operand: 0b00000000 }, // OUT
            { opcode: 0b00110011, operand: 0b00000000 }  // END
        ];

        await vm.execute(instructions);
        expect(output).toBe(15);
    });
});
