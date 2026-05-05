//% weight=100 color=#6473E3 icon="\uf085"
namespace a4_Gate {

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

    // =========================
    // GPIO (AUTO CONFIG)
    // =========================

    function setAnalogInput(io: IO) {
        writeReg(0x2c + io, pins.createBufferFromArray([2])) 
    }

    //%block="Motion detected by PIR sensor"
    export function pirSensor(): boolean{
        return pins.digitalReadPin(DigitalPin.P8)==1 //renvoie Vrai si le capteur détecte une présence 
    }

    //% block="%action gate"
    export function gate(action: Gate){
        if (action == Gate.CW){      //si choix=ouvrir portail
            digitalWrite(IO.C2, GPIOState.High) //C2 à l'état haut
            digitalWrite(IO.C1, GPIOState.Low) //C1 à l'état bas
        }
        if (action == Gate.CCW){      //si choix=fermer portail
            digitalWrite(IO.C2, GPIOState.Low)
            digitalWrite(IO.C1, GPIOState.High)
        }
        if (action == Gate.Stop){      //si choix=arrêter portail
            digitalWrite(IO.C2, GPIOState.High)
            digitalWrite(IO.C1, GPIOState.High)
        }
    }

    //% block="%state light"
    export function led(state: State) {
        if (state == State.ON) {
            pins.digitalWritePin(DigitalPin.P0, 1) //écrit 1 sur la broche P0 pour allumer la LED
        }
        else if (state == State.OFF) {
            pins.digitalWritePin(DigitalPin.P0, 0) //écrit 0 sur la broche P0 pour éteindre la LED
        }
    }

    //% block="%state IR emitter"
    export function emitterIR(state: State){
        if (state == State.ON) {
            digitalWrite(IO.C4, GPIOState.High) //met à l'état haut la broche C4 pour allumer l'émetteur
        }
        else if (state == State.OFF) {
            digitalWrite(IO.C4, GPIOState.Low) //met à l'état bas la broche C4 pour éteindre l'émetteur 
        }
    }

    //%block="%loc button pressed"
    export function buttonStateBoolean(loc: ButtonLocation){
        //affecte à une cte le pin correspondant au BP sélectionné par l'utilisateur
        let pin = (loc == ButtonLocation.Ext) ? DigitalPin.P1 : DigitalPin.P2 
        return pins.digitalReadPin(pin)==1 //renvoie Vrai si le BP est appuyé 
    }

    //%block="%fc limit switch on" 
    export function sensorState(fc: LimitSwitch){
        //affecte à une cte le pin correspondant au BP sélectionné par l'utilisateur
        let pin = (fc == LimitSwitch.Opening) ? DigitalPin.P15 : DigitalPin.P14 
        return pins.digitalReadPin(pin) == 1 //renvoie Vrai si le BP est appuyé 
    }

    //%block="Obstacle detected by IR sensor"
    export function irDetection() {
        return readDigital(IO.C5) == 1 //renvoie Vrai si le récepteur ne reçoit plus d'IR 
    }
    


    /////// Fonctions /////// 

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

    function analogRead(io: IO): number {
        init()

        setAnalogInput(io)

        let buf = readReg(0x45 + io * 3, 3)
        return (buf[1] << 8) | buf[2]
    }

    function setDigitalOutput(io: IO) {
        writeReg(0x2c + io, pins.createBufferFromArray([4]))
    }

    function setDigitalInput(io: IO) {
        writeReg(0x2c + io, pins.createBufferFromArray([5]))
    }

}

