
> Ouvrir cette page à [https://emsrn.github.io/blocs-portail-a4/](https://emsrn.github.io/blocs-portail-a4/)

## A4 Gate 

MakeCode extension for the **A4 sliding gate model** based on the **DFR1216 expansion board**, **BBC micro:bit**, and different modules connected to the expansion board.

## Product page and teaching resources 

Product information and educational resources are available on https://www.a4.fr/wiki/index.php?title=Portail_coulissant_(BE-APORT-COUL) 

Website : a4.fr

Product sheet : 

## Purpose 

This extension is designed for an educational sliding gate model used in technology lessons. 
It provides simple blocks to : 

### Hardware required 
* BBC micro:bit 
* DFR1216 expansion board
* modules connected to the pins (see product information for wiring diagram)

## API overview 

* `Obstacle detected by IR`
* `Opening/Closing limit switch on`
* `Outside/Inside button pressed`
* `Turn on/off IR emitter`
* `Turn on/off light`
* `Open/Close gate`
* `Motion detected by PIR sensor`

## Example 

```typescript
function open () {
    while (!(a4_Gate.sensorState(LimitSwitch.Opening))) {
        a4_Gate.gate(Gate.CW)
    }
    a4_Gate.gate(Gate.Stop)
}
function close () {
    while (!(a4_Gate.sensorState(LimitSwitch.Closing))) {
        a4_Gate.gate(Gate.CCW)
    }
    a4_Gate.gate(Gate.Stop)
}
basic.forever(function () {
    if (a4_Gate.buttonStateBoolean(ButtonLocation.Ext) || a4_Gate.buttonStateBoolean(ButtonLocation.Int)) {
        open()
        basic.pause(3000)
        close()
    }
})
````

## License 

MIT

## Supported targets 
* for PXT/microbit
