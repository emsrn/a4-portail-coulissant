function ouvrir () {
    a4_Gate.gate(Gate.CW)
    while (!(a4_Gate.sensorState(LimitSwitch.Opening))) {
        a4_Gate.led(State.ON)
        basic.pause(500)
        a4_Gate.led(State.OFF)
        basic.pause(500)
    }
    a4_Gate.gate(Gate.Stop)
}
function fermer () {
    a4_Gate.gate(Gate.CCW)
    while (!(a4_Gate.sensorState(LimitSwitch.Closing))) {
        if (a4_Gate.irDetection()) {
            while (!(a4_Gate.sensorState(LimitSwitch.Opening))) {
                ouvrir()
            }
            basic.pause(2000)
        }
        if (a4_Gate.buttonStateBoolean(ButtonLocation.Ext) || a4_Gate.buttonStateBoolean(ButtonLocation.Int)) {
            a4_Gate.gate(Gate.CCW)
        }
        a4_Gate.led(State.ON)
        basic.pause(500)
        a4_Gate.led(State.OFF)
        basic.pause(500)
    }
    a4_Gate.gate(Gate.Stop)
}
a4_Gate.emitterIR(State.ON)
fermer()
basic.forever(function () {
    if (a4_Gate.buttonStateBoolean(ButtonLocation.Ext) || a4_Gate.buttonStateBoolean(ButtonLocation.Int)) {
        if (a4_Gate.sensorState(LimitSwitch.Opening)) {
            fermer()
        } else {
            ouvrir()
        }
    }
})
