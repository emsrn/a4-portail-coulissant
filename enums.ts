enum Gate {
    //% block="Open"
    CW = 0,
    //% block="Close"
    CCW = 1,
    //% block="Stop"
    Stop,
}

enum State {
    //% block="Turn on"
    ON, 
    //% block="Turn off"
    OFF,
}

enum ButtonLocation{
    //% block="Outside"
    Ext,
    //% block="Inside"
    Int,
}

enum LimitSwitch{
    //%block="Opening"
    Opening,
    //%block="Closing"
    Closing,
}


enum IO {
    C0 = 0,
    C1,
    C2,
    C3,
    C4,
    C5
}


enum GPIOState {
    //% block="LOW"
    Low = 0,
    //% block="HIGH"
    High = 1
}

enum FontSize {
    //% block="Large"
    Large = 1,
    //% block="Small"
    Small = 2,
}
