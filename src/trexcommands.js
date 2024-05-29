
module.exports = function (RED) {
    'use strict';
    const mustache = require('mustache');
    const sql = require('mssql');

    /**
     * checks if `n` is a valid number.
     * @param {string | number} n
     */
    function isNumber (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    /**
     * Parse a string or number into an integer and return it.
     * If `n` cannot be parsed, `defaultValue` is returned instead.
     * @param {string | number} n
     * @param {boolean} defaultValue - the value to return if `n` is not a valid number
     * @returns {integer} `n` parsed to an integer or `defaultValue` if `n` is invalid
     */
    function safeParseInt (n, defaultValue) {
        try {
            const x = parseInt(n);
            if (isNumber(x)) {
                return x;
            }
        } catch (error) {
            // do nothing
        }
        return defaultValue;
    }

    function checkPayload(payload) {
        let result = { "isOk" : false };
        if(!payload.WorkstationId){
            return result;
        }
        result.wsId = payload.WorkstationId;

        if(payload.operationMode == "1" ) { // Load Job Plan
            if(!payload.PlanId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "PlanId": payload.PlanId });
            result.isOk = true;
        }
        else if(payload.operationMode == "4" ) { // Finish Production
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "Quantity": 0, "ReferenceQuantityType": 0, "IsQuantityApproved": false });
            result.isOk = true;
        }
        else if(payload.operationMode == "5" ) { // Start Stoppage
            if(!payload.StoppageCauseId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "StoppageCauseId": payload.StoppageCauseId });
            result.isOk = true;
        }
        else if(payload.operationMode == "6" ) { // Change Stoppage
            if(!payload.StoppageCauseId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "StoppageCauseId": payload.StoppageCauseId });
            result.isOk = true;
        }
        else if(payload.operationMode == "7" ) { // Finish Stoppage
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId });
            result.isOk = true;
        }  
        else if(payload.operationMode == "9" ) { // Login Employee
            if(!payload.EmployeeId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "EmployeeId": payload.EmployeeId });
            result.isOk = true;
        }              
        else if(payload.operationMode == "10" ) { // Logout Employee
            if(!payload.EmployeeId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "EmployeeId": payload.EmployeeId });
            result.isOk = true;
        }    
        else if(payload.operationMode == "13" ) { // Shifted Shift
            if(!payload.LineId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "LineId": payload.LineId });
            result.isOk = true;
        } 
        else if(payload.operationMode == "14" ) { // Start Test Mode
            if(!payload.StoppageCauseId){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "StoppageCauseId": payload.StoppageCauseId });
            result.isOk = true;
        } 
        else if(payload.operationMode == "15" ) { // Finish Test Mode
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId });
            result.isOk = true;
        }
        else if(payload.operationMode == "16" ) { // Create Deffect
            if(!payload.DefectId){
                return result;
            }
            if(!payload.StockId){
                return result;
            }
            if(!payload.Quantity){
                return result;
            }
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId, "DefectId": payload.DefectId, "StockId": payload.StockId, "Quantity": payload.Quantity, "ReferenceQuantityType": 0 });
            result.isOk = true;
        }                                        
        return result;
    }

    function sqlNgpCommandQueInsert(record) {
        let sql =
        `DECLARE 
        @maxID INT, 
        @companyId INT, 
        @userID INT, 
        @wsId INT, 
        @cmdId INT,
        @command NVARCHAR(MAX) 
    
        EXEC DBO.GETTABLEMAXVALUE 'NGPCOMMANDQUEUE', 'COMMANDID', @maxID OUTPUT SELECT @maxID maxID
        
        set @userID = ${record.userId}
        set @companyId =  ${record.companyId}
        set @wsId = ${record.wsId}
        set @command = '${record.command}'
        set @cmdId = ${record.cmdId}     
        
        INSERT INTO NGPCOMMANDQUEUE (COMPANYID, COMMANDID,COMMANDTYPE,PWORKSTATIONID,COMMAND,ISPROCESSED,INSERTUSERID,INSERTDATE)
        values(@companyId, @maxId, @cmdId, @wsId, @command, 0, @userId, getdate())`;
        
        return sql;
    }

    function connection(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        //add mustache transformation to connection object
        const configStr = JSON.stringify(config);
        const transform1 = mustache.render(configStr, process.env);
        config = JSON.parse(transform1);

        //add mustache transformation to credentials object
        try {
            const credStr = JSON.stringify(node.credentials);
            const transform2 = mustache.render(credStr, process.env);
            node.credentials = JSON.parse(transform2);
        } catch (error) {
            console.error(error);
        }

        node.config = {
            user: (node.credentials ? node.credentials.username : '') || '',
            password: (node.credentials ? node.credentials.password : '') || '',
            domain: node.credentials ? node.credentials.domain : '',
            server: config.server,
            database: config.database,
            companyId: config.companyId,
            userId: config.userId,
            options: {
                port: config.port ? safeParseInt(config.port, 1433) : undefined,
                tdsVersion: config.tdsVersion || '7_4',
                encrypt: config.encyption,
                trustServerCertificate: !((config.trustServerCertificate === 'false' || config.trustServerCertificate === false)), //defaults to true for backwards compatibility - TODO: Review this default.
                useUTC: config.useUTC,
                connectTimeout: config.connectTimeout ? safeParseInt(config.connectTimeout, 15000) : undefined,
                requestTimeout: config.requestTimeout ? safeParseInt(config.requestTimeout, 15000) : undefined,
                cancelTimeout: config.cancelTimeout ? safeParseInt(config.cancelTimeout, 5000) : undefined,
                camelCaseColumns: (config.camelCaseColumns === 'true' || config.camelCaseColumns === true) ? true : undefined, //defaults to undefined.
                parseJSON: !!((config.parseJSON === 'true' || config.parseJSON === true)), //defaults to true.
                enableArithAbort: !((config.enableArithAbort === 'false' || config.enableArithAbort === false)), //defaults to true.
                readOnlyIntent: (config.readOnlyIntent === 'true' || config.readOnlyIntent === true) //defaults to false.
            },
            pool: {
                max: safeParseInt(config.pool, 5),
                min: 0,
                idleTimeoutMillis: 3000
                //log: (message, logLevel) => console.log(`POOL: [${logLevel}] ${message}`)
            }
        };

        //config options seem to differ between pool and tedious connection
        //so for compatibility I just repeat the ones that differ so they get picked up in _poolCreate ()
        node.config.port = node.config.options.port;
        node.config.connectionTimeout = node.config.options.connectTimeout;
        node.config.requestTimeout = node.config.options.requestTimeout;
        node.config.cancelTimeout = node.config.options.cancelTimeout;
        node.config.encrypt = node.config.options.encrypt;

        node.connectedNodes = [];

        node.connectionCleanup = function (quiet) {
            const updateStatusAndLog = !quiet;
            try {
                if (node.poolConnect) {
                    if (updateStatusAndLog) node.log(`Disconnecting server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                    node.poolConnect.then(_ => _.close()).catch(e => { console.error(e); });
                }
            } catch (error) {
            }

            // node-mssql 5.x to 6.x changes
            // ConnectionPool.close() now returns a promise / callbacks will be executed once closing of the
            if (node.pool && node.pool.close) {
                node.pool.close().catch(() => {})
            }
            if (updateStatusAndLog) node.status({ fill: 'grey', shape: 'dot', text: 'disconnected' });
            node.poolConnect = null;
        };

        node.pool = new sql.ConnectionPool(node.config);
        node.pool.on('error', err => {
            node.error(err);
            node.connectionCleanup();
        });

        node.connect = function () {
            if (node.poolConnect) {
                return;
            }
            node.status({
                fill: 'yellow',
                shape: 'dot',
                text: 'connecting'
            });
            node.poolConnect = node.pool.connect();
            return node.poolConnect;
        };

        node.execSql = async function (queryMode, sqlQuery, params, paramValues, callback) {
            const _info = [];
            try {
                if (!node.poolConnect && !!(await node.connect())) {
                    node.log(`Connected to server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                }

                const req = node.pool.request();

                req.on('info', info => {
                    _info.push(info);
                });
								
                let result;
                switch (queryMode) {
                /*case 'bulk':
                    result = await req.bulk(bulkTable);
                    break;*/
                case 'execute':
                    result = await req.execute(sqlQuery);
                    break;
                default:				
                    result = await req.query(sqlQuery);
                    break;
                }
				
                callback(null, result, _info);
            } catch (e) {
                node.log(`Error connecting to server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                console.error(e);
                node.poolConnect = null;
                callback(e);
            }
        };

        node.disconnect = function (nodeId) {
            const index = node.connectedNodes.indexOf(nodeId);
            if (index >= 0) {
                node.connectedNodes.splice(index, 1);
            }
            if (node.connectedNodes.length === 0) {
                node.connectionCleanup();
            }
        };
    }

    RED.nodes.registerType('trexMes-CN', connection, {
        credentials: {
            username: {
                type: 'text'
            },
            password: {
                type: 'password'
            },
            domain: {
                type: 'text'
            }
        }
    });


    function trexcommands(config) {
        RED.nodes.createNode(this, config);
        const trexmesCN = RED.nodes.getNode(config.trexmesCN);
        const node = this;

        node.query = config.query;
        node.outField = 'payload';
        node.returnType = 0;
        node.throwErrors = !(!config.throwErrors || config.throwErrors === '0');

        node.modeOptType = config.modeOptType || '1';

        const setResult = function (msg, field, value, returnType = 0) {
            const set = (obj, path, val) => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                // eslint-disable-next-line no-return-assign
                const lastObj = keys.reduce((obj, key) =>
                    obj[key] = obj[key] || {},
                obj);
                lastObj[lastKey] = val;
            };
            set(msg, field, value.recordset);
        };
		
        node.processError = function (err, msg) {
            let errMsg = 'Error';
            if (typeof err === 'string') {
                errMsg = err;
                msg.error = err;
            } else if (err && err.message) {
                errMsg = err.message;

                if (err.precedingErrors !== undefined &&
                     err.precedingErrors.length &&
                     err.precedingErrors[0].originalError !== undefined &&
                     err.precedingErrors[0].originalError.info !== null &&
                     err.precedingErrors[0].originalError.info.message !== null) {
                    errMsg += ' (' + err.precedingErrors[0].originalError.info.message + ')';
                }
                //Make an error object from the err.  NOTE: We cant just assign err to msg.error as a promise
                //rejection occurs when the node has 2 wires on the output.
                //(redUtil.cloneMessage(m) causes error "node-red Cannot assign to read only property 'originalError'")
                msg.error = {
                    class: err.class,
                    code: err.code,
                    lineNumber: err.lineNumber,
                    message: err.message,
                    details: errMsg,
                    name: err.name,
                    number: err.number,
                    procName: err.procName,
                    serverName: err.serverName,
                    state: err.state,
                    toString: function () {
                        return this.message;
                    }
                };
            }

            node.status({
                fill: 'red',
                shape: 'ring',
                text: errMsg
            });

            if (node.throwErrors) {
                node.error(msg.error, msg);
            } else {
                node.log(err);
                node.send(msg);
            }
        };

        node.on('input', function (msg) {
            node.status({}); //clear node status
            delete msg.error; //remove any .error property passed in from previous node

            let splitted = node.modeOptType.split('|');
			msg.operationMode = "1";
			if(splitted.length > 1) {
				msg.operationMode = splitted[0];
			}
			
            doSQL(node, msg);            
        });

        function doSQL(node, msg) {
            node.status({
                fill: 'blue',
                shape: 'dot',
                text: 'requesting'
            });

            try {
				
				let query = "";                               
                let resultCmd = checkPayload(msg);                
                if ( resultCmd.isOk == false ) {
                    node.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'payload data not enough!'
                    });

                    return;
                }               

				let record = {};
                record.companyId = trexmesCN.config.companyId;
                record.userId = trexmesCN.config.userId;
                record.cmdId = msg.operationMode;
                record.command = resultCmd.command;
                record.wsId = resultCmd.wsId;
                
                query = sqlNgpCommandQueInsert(record);
                //node.log("query: " + query);
				
                trexmesCN.execSql("", query, [], {}, function (err, data, info) {
                    if (err) {
                        node.processError(err, msg);
                    } else {
                        node.status({
                            fill: 'yellow',
                            shape: 'dot',
                            text: 'Sended, aprove waiting.. '
                        });                        
                        setResult(msg, node.outField, data, node.returnType);
                        //node.send(msg);
                        //node.send(msg.payload.length);
                        let commandId = 0;
                        if(msg.payload.length>0) {
                            commandId = msg.payload[0].maxID;
                        }
                        //Process onay bekleniyor
                        setTimeout(function () {
                            query = "select Q.COMMANDID,Q.ISPROCESSED,P.ISSUCCESS,P.MESSAGE from NGPCOMMANDQUEUE Q join NGPCOMMANDRESPONSE P on Q.COMMANDID = P.COMMANDID where P.COMMANDID=" + commandId;                            
                            //node.log(query);
                            trexmesCN.execSql("", query, [], {}, function (err, data, info) {
                                if (err) {
                                    node.processError(err, msg);
                                } else {  
                                    setResult(msg, node.outField, data, node.returnType);
                                    let isProcessed = 0;
                                    let isSuccess = 0;
                                    let message = "";
                                    if(msg.payload.length>0) {
                                        isProcessed = msg.payload[0].ISPROCESSED;
                                        isSuccess = msg.payload[0].ISSUCCESS;
                                        message =  msg.payload[0].MESSAGE;
                                    }
                                    node.send(msg);
                                    if( isProcessed == 1 && isSuccess == 1) {
                                        node.status({
                                            fill: 'green',
                                            shape: 'dot',
                                            text: 'done'
                                        });      
                                    }
                                    else if( isProcessed == 1 && isSuccess == 0) {
                                        node.status({
                                            fill: 'yellow',
                                            shape: 'dot',
                                            text: 'done with error: ' + message 
                                        });    
                                    }
                                    else {
                                        node.status({
                                            fill: 'blue',
                                            shape: 'dot',
                                            text: 'command not processed in 2 sec.'
                                        });   
                                    }
                                }
                            });
                        }, 2000);      
                    }
                });
            } catch (err) {
                node.processError(err, msg);
            }
        }
        
		node.on('close', function () {
            trexmesCN.disconnect(node.id);
        });
    }
    
	RED.nodes.registerType('trexMes-CMD', trexcommands);
};
