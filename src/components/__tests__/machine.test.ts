import { suite, it, expect } from 'vitest'
import machine from '@/libs/interpreter-core/machine'

suite('Interpreter-Core-Machine', () => {
  it('test run', async () => {
    const vm = new machine(8);

    let output = 0;

    const outputDevice = async (value: number) => {
        output = value;
    }
    
    const instructions = [
        {
            opcode: 0b00000000, // LDM #97 (Load ASCII 'a' into ACC)
            operand: 0b01100001
        },
        {
            opcode: 0b00010001, // OUT (Output the value in ACC)
            operand: 0b00000000
        },
        {
            opcode: 0b00000111, // END (End the program)
            operand: 0b00000000
        }
    ]

    vm.addDevice("output", outputDevice);

    await vm.execute(instructions);
    expect(output).toBe(97);
  })
})
