# node-red-trexmes-iot-iobox

This is a [Node-Red][1] package that communicates via a serial port (rs232) with a Trex Mes IoT-IoBox hardware developed by [Mert Software & Electronics][2] IoT-IoBox is an affordable automation device whose hardware accepts 12 digital input signals and generates 4 digital output signals. The counter total information is produced by counting the changes that occur with the 0-1 change of the signal belonging to the 12 inputs. Likewise, the cycle time of 0-1 change of each input is calculated in milliseconds to the card. With these 12 inputs, counter and loop values, the last status of 4 output signals can be read instantaneously with this Node-red node and the last status of each selected signal value can be taken as the node output.

![Iot-IoBox image](assets/iocard.png)

Trex Mes IoT-IoBox hardware technical specifications
 
1. 24 Volt Power Supply input: It must be fed with 24 volt & 1 Ampere Power Supply input.
2. 12 pcs npn or pnp 24 volt input
3. 4 dry contact output: 4 x 250 VAC, 5A no contact outputs
4. 24 volt pnp encoder input
5. Cascade communication port input
6. RS232 communication port


# Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-trexmes-iot-iobox

# Usage
Input, counter and cycle values to be viewed are selected from the editing interface. 

**Transfer only changed values :** With this selection box, the ports whose values have changed are sent to the output. 

**Single output:** It is ensured that the port values are sent to a single output.

Node output numbers are formed dynamically depending on the selections.

IoBox has 4 output digital ports. To make them active or inactive, the payload.out values sent to the node must be set. For example, if **msg.payload.out1 = 1** is sent, output 1 of the IoBox will be activated.

![Iot-IoBox Node image1](assets/1.jpg)

![Iot-IoBox Node image1](assets/2.jpg)

![Iot-IoBox Node image1](assets/3.jpg)

![Iot-IoBox Node image1](assets/4.jpg)

# Requirements

The package currently requires [Node.js 18.16][1] or higher.

# Authors

[Asaf Yurdakul][4]

[1]:http://nodered.org
[2]:https://mertyazilim.com.tr/
[4]:https://github.com/asafyurdakul

