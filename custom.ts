//% weight=100 color=#6473E3 icon="\uf085"
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

    export const ADDR = 0x45

    const REG_CONFIG = 0x00
    const REG_SHUNT_VOLTAGE = 0x01
    const REG_CURRENT = 0x04
    const REG_CALIBRATION = 0x05

    function writeReg16(reg: number, value: number): void {
        let buf = pins.createBuffer(3)
        buf[0] = reg
        buf[1] = (value >> 8) & 0xFF
        buf[2] = value & 0xFF
        pins.i2cWriteBuffer(ADDR, buf, false)
    }

    function readReg16Unsigned(reg: number): number {
        pins.i2cWriteNumber(ADDR, reg, NumberFormat.UInt8BE, true)
        let buf = pins.i2cReadBuffer(ADDR, 2, false)
        return (buf[0] << 8) | buf[1]
    }

    function readReg16Signed(reg: number): number {
        let v = readReg16Unsigned(reg)
        if (v > 0x7FFF) v = v - 0x10000
        return v
    }

    /////// FUNCTIONS FOR LCD DISPLAY ///////

    const IIC_MAX_TRANSFER_SIZE = 32;

    // cmd len
    const CMDLEN_OF_HEAD_LEN = 3;
    const CMD_SET_LEN = 0x07;

    // cmd
    const CMD_SET_BACKGROUND_COLOR = 0x19;

    const CMD_HEADER_HIGH = 0x55;
    const CMD_HEADER_LOW = 0xaa;

    let address = 0x2c;

    function data24Tobyte(data: number): number[] {
        return [(data >> 16) & 0xFF, (data >> 8) & 0xFF, data & 0xFF];
    }

    function colorToCustom(color: number): number {
        switch (color) {
            case 0x999999:
                return 0x696969;
            case 0x7f00ff:
                return 0x800080;
            default:
                return color;
        }
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

    function lcdSetBgcolor(color: number) {
        setBackgroundColor(colorToCustom(color));
    }

    function lcdInitIIC() {
        basic.pause(1000)
    }

    function lcdClearAll() {
        cleanScreen();
    }

    function cleanScreen() {
        let cmd = creatCommand(0x1D, 0x04);
        writeCommand(cmd, 4);
        basic.pause(1500);
    }

    /////// BLOCKS ///////

    /**
     * Returns voltage measurement in mV using wattmeter module
     */
    //%block="Voltage measurement"
    export function shuntVoltage(): number {
        return readReg16Signed(REG_SHUNT_VOLTAGE) * 0.01
    }

    /**
     * Returns current measurement in mA using wattmeter module
     */
    //% block="Current measurement"
    export function current(): number {
        return readReg16Signed(REG_CURRENT)
    }

    /**
     * Initialize I2C communication for wattmeter module 
     */
    //%block="Initialize wattmeter I2C"
    export function initWattmeter(): void {
        writeReg16(REG_CONFIG, 0x3C1F)
        writeReg16(REG_CALIBRATION, 4096)
    }

    //%block="Motion detected by PIR sensor"
    export function pirSensor(): boolean {
        return pins.digitalReadPin(DigitalPin.P8) == 1 //renvoie Vrai si le capteur détecte une présence 
    }

    //% block="%action gate"
    export function gate(action: Gate) {
        if (action == Gate.CW) {      //si choix=ouvrir portail
            digitalWrite(IO.C2, GPIOState.High) //C2 à l'état haut
            digitalWrite(IO.C1, GPIOState.Low) //C1 à l'état bas
            mota1State=0
            mota2State=1
        }
        if (action == Gate.CCW) {      //si choix=fermer portail
            digitalWrite(IO.C2, GPIOState.Low)
            digitalWrite(IO.C1, GPIOState.High)
            mota1State=1
            mota2State=0
        }
        if (action == Gate.Stop) {      //si choix=arrêter portail
            digitalWrite(IO.C2, GPIOState.High)
            digitalWrite(IO.C1, GPIOState.High)
            mota1State=1
            mota2State=1
        }
    }

    //% block="%state light"
    export function led(state: State) {
        if (state == State.ON) {
            pins.digitalWritePin(DigitalPin.P0, 1) //écrit 1 sur la broche P0 pour allumer la LED 
            ledState=1
        }
        else if (state == State.OFF) {
            pins.digitalWritePin(DigitalPin.P0, 0) //écrit 0 sur la broche P0 pour éteindre la LED
            ledState=0
        }
    }

    //% block="%state IR emitter"
    export function emitterIR(state: State) {
        if (state == State.ON) {
            digitalWrite(IO.C4, GPIOState.High) //met à l'état haut la broche C4 pour allumer l'émetteur
            emitterIRState=1
        }
        else if (state == State.OFF) {
            digitalWrite(IO.C4, GPIOState.Low) //met à l'état bas la broche C4 pour éteindre l'émetteur
            emitterIRState=0
        }
    }

    //%block="%loc button pressed"
    export function buttonStateBoolean(loc: ButtonLocation) {
        //affecte à une cte le pin correspondant au BP sélectionné par l'utilisateur
        let pin = (loc == ButtonLocation.Ext) ? DigitalPin.P1 : DigitalPin.P2
        return pins.digitalReadPin(pin) == 1 //renvoie Vrai si le BP est appuyé 
    }

    //%block="%fc limit switch on" 
    export function sensorState(fc: LimitSwitch) {
        //affecte à une cte le pin correspondant au BP sélectionné par l'utilisateur
        let pin = (fc == LimitSwitch.Opening) ? DigitalPin.P15 : DigitalPin.P14
        return pins.digitalReadPin(pin) == 1 //renvoie Vrai si le BP est appuyé 
    }

    //%block="Obstacle detected by IR sensor"
    export function irDetection() {
        return readDigital(IO.C5) == 1 //renvoie Vrai si le récepteur ne reçoit plus d'IR 
    }

    //%block="Display all modules states" 
    export function displayModulesStates() {
        lcdInitIIC()
        lcdClearAll()
        lcdSetBgcolor(0x0000ff)
        while (true) {
            lcdDisplay.lcdDisplayText("MODULES STATES ", 1, 40, 4, lcdDisplay.FontSize.Large, 0xffffff)
            lcdDisplay.lcdDisplayText("Outside PB : " + pins.digitalReadPin(DigitalPin.P1), 2, 20, 35, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("Inside PB : " + pins.digitalReadPin(DigitalPin.P2), 3, 20, 55, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("Opening limit switch : " + pins.digitalReadPin(DigitalPin.P15), 4, 20, 75, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("Closing limit switch : " + pins.digitalReadPin(DigitalPin.P14), 5, 20, 95, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("MOTA-1 : " + mota1State, 6, 20, 115, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("MOTA-2 : " + mota2State, 7, 20, 135, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("IR emitter : " + emitterIRState, 8, 20, 155, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("IR sensor : " + readDigital(IO.C5), 9, 20, 175, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("LED : " + ledState, 10, 20, 195, lcdDisplay.FontSize.Small, 0xffffff)
            lcdDisplay.lcdDisplayText("PIR sensor : " + pins.digitalReadPin(DigitalPin.P8), 11, 20, 215, lcdDisplay.FontSize.Small, 0xffffff)
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
