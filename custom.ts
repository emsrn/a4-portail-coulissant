//% weight=100 color=#6473E3 icon="\uf085"
//%groups="['Modules', 'Wattmeter', 'Debugging']
namespace a4_Gate {

    let mota1State = 0
    let mota2State = 0
    let emitterIRState = 0
    let ledState = 0


    /////// FUNCTIONS FOR I2C ///////

    const I2C_ADDR = 0x33

    let initialized = false

    function init() {
        if (!initialized) {
            initialized = true
            basic.pause(100)
        }
    }

    function writeReg(reg: number, data: Buffer) {
        let buf = pins.createBuffer(data.length + 1)
        buf[0] = reg
        for (let i = 0; i < data.length; i++) {
            buf[i + 1] = data[i]
        }
        pins.i2cWriteBuffer(I2C_ADDR, buf)
    }

    function readReg(reg: number, len: number): Buffer {
        pins.i2cWriteNumber(I2C_ADDR, reg, NumberFormat.UInt8BE)
        return pins.i2cReadBuffer(I2C_ADDR, len)
    }

    /////// FUNCTIONS FOR WATTMETER ///////

    let wattmeterInitialized = false
    function ensureWattmeterInitialized(): void {
        if (!wattmeterInitialized) {
            wattmeterInitialized = begin(i2cAddr)
        }
    }

    // Adresses I2C possibles
    export enum I2CAddress {
        ADDR_0x40 = 0x40,
        ADDR_0x41 = 0x41,
        ADDR_0x44 = 0x44,
        ADDR_0x45 = 0x45
    }

    // Registres INA219
    const REG_CONFIG = 0x00
    const REG_SHUNT_VOLTAGE = 0x01
    const REG_BUS_VOLTAGE = 0x02
    const REG_POWER = 0x03
    const REG_CURRENT = 0x04
    const REG_CALIBRATION = 0x05

    // Bus voltage range
    export enum BusVoltageRange {
        RANGE_16V = 0,
        RANGE_32V = 1
    }

    // PGA - Shunt voltage range
    export enum PGABits {
        PGA_1 = 0, // ±40 mV
        PGA_2 = 1, // ±80 mV
        PGA_4 = 2, // ±160 mV
        PGA_8 = 3  // ±320 mV
    }

    // ADC resolution
    export enum ADCBits {
        ADC_9BIT = 0,
        ADC_10BIT = 1,
        ADC_11BIT = 2,
        ADC_12BIT = 3
    }

    // ADC sample size
    export enum ADCSample {
        SAMPLE_1 = 0,
        SAMPLE_2 = 1,
        SAMPLE_4 = 2,
        SAMPLE_8 = 3,
        SAMPLE_16 = 4,
        SAMPLE_32 = 5,
        SAMPLE_64 = 6,
        SAMPLE_128 = 7
    }

    // Mode de fonctionnement
    export enum Mode {
        POWER_DOWN = 0,
        SHUNT_VOLT_TRIGGERED = 1,
        BUS_VOLT_TRIGGERED = 2,
        SHUNT_AND_BUS_TRIGGERED = 3,
        ADC_OFF = 4,
        SHUNT_VOLT_CONTINUOUS = 5,
        BUS_VOLT_CONTINUOUS = 6,
        SHUNT_AND_BUS_CONTINUOUS = 7
    }

    let i2cAddr = I2CAddress.ADDR_0x45
    let calValue = 4096

    function writeRegister(register: number, value: number): void {
        let buf = pins.createBuffer(3)
        buf[0] = register
        buf[1] = (value >> 8) & 0xff
        buf[2] = value & 0xff
        pins.i2cWriteBuffer(i2cAddr, buf)
    }

    function readRegister(register: number): number {
        pins.i2cWriteNumber(i2cAddr, register, NumberFormat.UInt8BE, false)
        let value = pins.i2cReadNumber(i2cAddr, NumberFormat.UInt16BE, false)

        // Conversion en entier signé 16 bits
        if (value & 0x8000) {
            value = value - 0x10000
        }

        return value
    }

    function readUnsignedRegister(register: number): number {
        pins.i2cWriteNumber(i2cAddr, register, NumberFormat.UInt8BE, false)
        return pins.i2cReadNumber(i2cAddr, NumberFormat.UInt16BE, false)
    }

    export function scan(addr: I2CAddress = I2CAddress.ADDR_0x45): boolean {
        i2cAddr = addr

        try {
            pins.i2cWriteNumber(i2cAddr, 0x00, NumberFormat.UInt8BE, false)
            return true
        } catch (e) {
            return false
        }
    }

    export function begin(addr: I2CAddress = I2CAddress.ADDR_0x45): boolean {
        i2cAddr = addr

        if (!scan(addr)) {
            return false
        }

        calValue = 4096

        setBusRange(BusVoltageRange.RANGE_32V)
        setPGA(PGABits.PGA_8)
        setBusADC(ADCBits.ADC_12BIT, ADCSample.SAMPLE_8)
        setShuntADC(ADCBits.ADC_12BIT, ADCSample.SAMPLE_8)
        setMode(Mode.SHUNT_AND_BUS_CONTINUOUS)

        writeRegister(REG_CALIBRATION, calValue)

        return true
    }

    export function linearCal(ina219ReadingmA: number, extMeterReadingmA: number): void {
        if (ina219ReadingmA == 0) {
            return
        }

        calValue = Math.idiv(extMeterReadingmA * calValue, ina219ReadingmA)
        calValue = calValue & 0xfffe

        writeRegister(REG_CALIBRATION, calValue)
    }

    export function setBusRange(value: BusVoltageRange): void {
        let conf = readUnsignedRegister(REG_CONFIG)

        conf &= ~(0x01 << 13)
        conf |= value << 13

        writeRegister(REG_CONFIG, conf)
    }

    export function setPGA(bits: PGABits): void {
        let conf = readUnsignedRegister(REG_CONFIG)

        conf &= ~(0x03 << 11)
        conf |= bits << 11

        writeRegister(REG_CONFIG, conf)
    }

    export function setBusADC(bits: ADCBits, sample: ADCSample): void {
        let value = 0

        if (bits < ADCBits.ADC_12BIT && sample > ADCSample.SAMPLE_1) {
            return
        }

        if (bits < ADCBits.ADC_12BIT) {
            value = bits
        } else {
            value = 0x80 | sample
        }

        let conf = readUnsignedRegister(REG_CONFIG)

        conf &= ~(0x0f << 7)
        conf |= value << 7

        writeRegister(REG_CONFIG, conf)
    }

    export function setShuntADC(bits: ADCBits, sample: ADCSample): void {
        let value = 0

        if (bits < ADCBits.ADC_12BIT && sample > ADCSample.SAMPLE_1) {
            return
        }

        if (bits < ADCBits.ADC_12BIT) {
            value = bits
        } else {
            value = 0x80 | sample
        }

        let conf = readUnsignedRegister(REG_CONFIG)

        conf &= ~(0x0f << 3)
        conf |= value << 3

        writeRegister(REG_CONFIG, conf)
    }

    export function setMode(mode: Mode): void {
        let conf = readUnsignedRegister(REG_CONFIG)

        conf &= ~0x07
        conf |= mode

        writeRegister(REG_CONFIG, conf)
    }
    /////// FUNCTIONS FOR LCD DISPLAY ///////

    const IIC_MAX_TRANSFER_SIZE = 32;

    // cmd len
    const CMDLEN_OF_HEAD_LEN = 3;
    const CMD_SET_LEN = 0x07;

    // cmd
    const CMD_SET_BACKGROUND_COLOR = 0x19;
    const CMD_OF_DRAW_TEXT = 0x18;

    const CMD_HEADER_HIGH = 0x55;
    const CMD_HEADER_LOW = 0xaa;

    let address = 0x2c;

    function data24Tobyte(data: number): number[] {
        return [(data >> 16) & 0xFF, (data >> 8) & 0xFF, data & 0xFF];
    }

    function creatCommand(cmd: number, len: number): number[] {
        return [CMD_HEADER_HIGH, CMD_HEADER_LOW, len - CMDLEN_OF_HEAD_LEN, cmd];
    }

    function writeCommand(data: number[], len: number) {
        let remain = len
        let i = 0

        while (remain > 0) {
            let currentTransferSize = (remain > IIC_MAX_TRANSFER_SIZE) ? IIC_MAX_TRANSFER_SIZE : remain

            pins.i2cWriteBuffer(
                address,
                pins.createBufferFromArray(data.slice(
                    i * IIC_MAX_TRANSFER_SIZE,
                    i * IIC_MAX_TRANSFER_SIZE + currentTransferSize
                )),
                remain > IIC_MAX_TRANSFER_SIZE
            )

            remain = remain - currentTransferSize
            i = i + 1
        }
    }

    function setBackgroundColor(color: number) {
        let cmd = creatCommand(CMD_SET_BACKGROUND_COLOR, CMD_SET_LEN);
        cmd = cmd.concat(data24Tobyte(color));
        writeCommand(cmd, CMD_SET_LEN);
        basic.pause(300);
    }

    function lcdClearAll() {
        cleanScreen();
    }

    function cleanScreen() {
        let cmd = creatCommand(0x1D, 0x04);
        writeCommand(cmd, 4);
        basic.pause(1500);
    }

    //% num.min=1 num.max=255 num.defl=1
    //% x.min=0 x.max=320 x.defl=120
    //% y.min=0 y.max=240 y.defl=120
    //% color.shadow="colorNumberPicker"
    //% inlineInputMode=inline
    //% weight=75
    function lcdDisplayText(text: string, num: number, x: number, y: number, size: FontSize, color: number) {
        updateString(num, x, y, text, size, color);
    }

    function updateString(id: number, x: number, y: number, str: string, fontSize: number, color: number) {
        let len = str.length > 242 ? 242 : str.length;
        let cmd = creatCommand(CMD_OF_DRAW_TEXT, len + 13);
        cmd = cmd.concat([id, fontSize]).concat(data24Tobyte(color)).concat(data16Tobyte(x)).concat(data16Tobyte(y));
        str.split("").forEach((value, index) => { cmd.push(value.charCodeAt(0)) });
        writeCommand(cmd, len + 13);
    }

    function data16Tobyte(data: number): number[] {
        return [(data >> 8) & 0xFF, data & 0xFF];
    }

    /////// BLOCKS ///////

    //%block="Bus Voltage in V"
    //%group='Wattmeter'
    export function getBusVoltageV(): number {
        ensureWattmeterInitialized()
        let value = readUnsignedRegister(REG_BUS_VOLTAGE)
        return (value >> 1) * 0.001
    }

    //%block="Shunt Voltage in mV"
    //%group='Wattmeter'
    export function getShuntVoltagemV(): number {
        ensureWattmeterInitialized()
        return readRegister(REG_SHUNT_VOLTAGE)
    }

    //%block="Current in mA"
    //%group='Wattmeter'
    export function getCurrentmA(): number {
        ensureWattmeterInitialized()
        return readRegister(REG_CURRENT)
    }

    //%block="Power in mW"
    //%group='Wattmeter'
    export function getPowermW(): number {
        ensureWattmeterInitialized()
        return readRegister(REG_POWER) * 20
    }

    //%block="Motion detected by PIR sensor"
    //%group='Modules'
    export function pirSensor(): boolean {
        return pins.digitalReadPin(DigitalPin.P8) == 1 //renvoie Vrai si le capteur détecte une présence 
    }

    //% block="%action gate"
    //%group='Modules'
    export function gate(action: Gate) {
        if (action == Gate.CW) {      //si choix=ouvrir portail
            digitalWrite(IO.C1, GPIOState.High) //C1 à l'état haut
            digitalWrite(IO.C2, GPIOState.Low) //C2 à l'état bas
            mota1State = 1
            mota2State = 0
        }
        if (action == Gate.CCW) {      //si choix=fermer portail
            digitalWrite(IO.C1, GPIOState.Low)
            digitalWrite(IO.C2, GPIOState.High)
            mota1State = 0
            mota2State = 1
        }
        if (action == Gate.Stop) {      //si choix=arrêter portail
            digitalWrite(IO.C1, GPIOState.High)
            digitalWrite(IO.C2, GPIOState.High)
            mota1State = 1
            mota2State = 1
        }
    }

    //% block="%state light"
    //%group='Modules'
    export function led(state: State) {
        if (state == State.ON) {
            pins.digitalWritePin(DigitalPin.P0, 1) //écrit 1 sur la broche P0 pour allumer la LED 
            ledState = 1
        }
        else if (state == State.OFF) {
            pins.digitalWritePin(DigitalPin.P0, 0) //écrit 0 sur la broche P0 pour éteindre la LED
            ledState = 0
        }
    }

    //% block="%state IR emitter"
    //%group='Modules'
    export function emitterIR(state: State) {
        if (state == State.ON) {
            digitalWrite(IO.C4, GPIOState.High) //met à l'état haut la broche C4 pour allumer l'émetteur
            emitterIRState = 1
        }
        else if (state == State.OFF) {
            digitalWrite(IO.C4, GPIOState.Low) //met à l'état bas la broche C4 pour éteindre l'émetteur
            emitterIRState = 0
        }
    }

    //%block="%loc button pressed"
    //%group='Modules'
    export function buttonStateBoolean(loc: ButtonLocation) {
        //affecte à une cte le pin correspondant au BP sélectionné par l'utilisateur
        let pin = (loc == ButtonLocation.Ext) ? DigitalPin.P1 : DigitalPin.P2
        return pins.digitalReadPin(pin) == 1 //renvoie Vrai si le BP est appuyé 
    }

    //%block="%fc limit switch on" 
    //%group='Modules'
    export function sensorState(fc: LimitSwitch) {
        //affecte à une cte le pin correspondant au BP sélectionné par l'utilisateur
        let pin = (fc == LimitSwitch.Opening) ? DigitalPin.P15 : DigitalPin.P14
        return pins.digitalReadPin(pin) == 1 //renvoie Vrai si le capteur est appuyé 
    }

    //%block="Obstacle detected by IR sensor"
    //%group='Modules'
    export function irDetection() {
        return readDigital(IO.C5) == 1 //renvoie Vrai si le récepteur ne reçoit plus d'IR 
    }

    //%block="Display all modules states" 
    //%group='Debugging'
    export function displayModulesStates() {
        basic.pause(1000)
        cleanScreen()
        setBackgroundColor(0x0000ff)
        while (true) {
            lcdDisplayText("MODULES STATES ", 1, 40, 4, FontSize.Large, 0xffffff)
            lcdDisplayText("Outside PB : " + pins.digitalReadPin(DigitalPin.P1), 2, 20, 35, FontSize.Small, 0xffffff)
            lcdDisplayText("Inside PB : " + pins.digitalReadPin(DigitalPin.P2), 3, 20, 55, FontSize.Small, 0xffffff)
            lcdDisplayText("Opening limit switch : " + pins.digitalReadPin(DigitalPin.P15), 4, 20, 75, FontSize.Small, 0xffffff)
            lcdDisplayText("Closing limit switch : " + pins.digitalReadPin(DigitalPin.P14), 5, 20, 95, FontSize.Small, 0xffffff)
            lcdDisplayText("MOTA-1 : " + mota1State, 6, 20, 115, FontSize.Small, 0xffffff)
            lcdDisplayText("MOTA-2 : " + mota2State, 7, 20, 135, FontSize.Small, 0xffffff)
            lcdDisplayText("IR emitter : " + emitterIRState, 8, 20, 155, FontSize.Small, 0xffffff)
            lcdDisplayText("IR sensor : " + readDigital(IO.C5), 9, 20, 175, FontSize.Small, 0xffffff)
            lcdDisplayText("LED : " + ledState, 10, 20, 195, FontSize.Small, 0xffffff)
            lcdDisplayText("PIR sensor : " + pins.digitalReadPin(DigitalPin.P8), 11, 20, 215, FontSize.Small, 0xffffff)
            basic.pause(500)
        }
    }


    /////// GPIO FUNCTIONS /////// 

    function digitalWrite(io: IO, state: GPIOState) { //fonction écrire sur un pin C (0 ou 1)
        setDigitalOutput(io)
        writeReg(0x39 + io, pins.createBufferFromArray([state]))
    }

    function readDigital(io: IO): number {

        init()

        setDigitalInput(io)
        basic.pause(10)

        return readReg(0x3f + io, 1)[0]
    }

    function setDigitalOutput(io: IO) {
        writeReg(0x2c + io, pins.createBufferFromArray([4]))
    }

    function setDigitalInput(io: IO) {
        writeReg(0x2c + io, pins.createBufferFromArray([5]))
    }

}
