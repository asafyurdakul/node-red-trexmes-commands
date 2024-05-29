# node-red-trexmes-commands

This is a [Node-Red][1] package that communicates with a [trex Mes][2] system

# Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-trexmes-commands

# Usage
The following operations can be performed with this node by communicating with the Trex-Mes system.
 - Load Job Plan
 - Finish Production
 - Start Stoppage
 - Change Stoppage
 - Finish Stoppage
 - Login Employee
 - Logout Employee
 - Shifted Shift
 - Start Test Mode
 - Finish Test Mode
 - Create Deffect

For configuration, first MS SQL server connection setting must be made. In addition, the "company" company identification id and the identification id of the personnel who will perform the transaction should be defined as default in the connection features, specifically for the Trex system.

Then, the relevant operation is selected from the "Operation Type" combo contained in the node.
The Json sample data requested as input is displayed on the node for each operation.

For example, the input example for "Load Job Plan" should be as follows
```sh
{
    "WorkstationId": 10,
    "PlanId": 123
}
```

When json data is sent in accordance with this sample data, the relevant operation is performed.

As an operation return, for example, when the operation is successful for the "Loas Job Plan" operation, the following information is returned.
```sh
{ 
    "COMMANDID":91,
    "ISPROCESSED":true,
    "ISSUCCESS":1,
    "MESSAGE":"LoadPlan Success"
}
```

The example can be found in the node-red import examples page.

![trexMes-CMD Node image1](https://raw.githubusercontent.com/asafyurdakul/node-red-trexmes-commands/master/src/assets/1.jpg)

# Requirements

The package currently requires [Node.js 18.16][1] or higher.

# Authors

[Asaf Yurdakul][4]

[1]:http://nodered.org
[2]:https://mertyazilim.com.tr/
[4]:https://github.com/asafyurdakul

