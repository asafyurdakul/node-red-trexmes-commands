
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
        let result = { "isOk" : false, "isGetFunc": false };
        if(!payload.WorkstationId){
            if(payload.operationMode != "102" )
            {
                return result;
            }
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
        else if(payload.operationMode == "100" ) { // Get Open Jobs
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId });
            result.isOk = true;
            result.isGetFunc = true;
        }   
        else if(payload.operationMode == "101" ) { // Get StopCause List
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId });
            result.isOk = true;
            result.isGetFunc = true;
        } 
        else if(payload.operationMode == "102" ) { // Get PWorkstation List
            result.command = JSON.stringify({ });
            result.isOk = true;
            result.isGetFunc = true;
        } 
        else if(payload.operationMode == "103" ) { // Get Station Status
            result.command = JSON.stringify({ "WorkstationId" : payload.WorkstationId });
            result.isOk = true;
            result.isGetFunc = true;
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

    function sqlGenerateProductionPlanQuery(record) {

        let SqlPorderNo = `(SELECT B.RECEIPTNO FROM PJOBORDERPROT B (NOLOCK) WHERE COMPANYID = ${record.companyId} 
                             AND B.CPERIODID = ${record.cperiodId} 
                             AND B.RECEIPTID = (SELECT TOP 1 B.PJOBORDERID FROM PPRODUCTPLANITEM B (NOLOCK) WHERE B.COMPANYID = ${record.companyId} AND B.PID = A.PID)) AS PORDERNO `;
        let SqlSipBilgi = " '' AS SIPBILGI";
        let SqlUreSipBilgi = `ISNULL((SELECT PORDERSNO FROM PORDERS (NOLOCK) WHERE COMPANYID = A.COMPANYID AND CPERIODID =  ${record.cperiodId}  AND PORDERSID = (SELECT PORDERSID FROM PJOBORDERPROT WHERE COMPANYID = A.COMPANYID AND CPERIODID =  ${record.cperiodId} 
                              AND RECEIPTID = A.PJOBORDERID)),'') AS URESIPBILGI `;
        let SqlUretilen = " A.PQUANTITY";
        let SqlPidWhere = ` AND A.PID IN (SELECT A.PID FROM PPRODUCTPLANWS A, PPRODUCTPLANITEM B, STOCK C (NOLOCK) 
                                            WHERE A.COMPANYID = B.COMPANYID
                                            AND A.PID = B.PID
                                            AND A.PIDSTATUS = 2
                                            AND B.COMPANYID = C.COMPANYID
                                            AND B.STOCKID = C.STOCKID)`;
        let SqlPWorkStation = "";
        let SqlIsYuklemeSirasi = "ROW_NUMBER() OVER(ORDER BY A.SORTID ASC) AS SEQUENCENO, ";
        //Planlı Bakımlar Gösterilmesin
        SqlPidWhere += " AND ISNULL(A.PTASKSID,0) != 99";

        if (record.isShowingOnlyJobsToCome) {
            SqlPidWhere += " AND A.STARTDATE >= GETDATE()";
        }
        if (record.isShowingOnlyPassedJobs) {
            SqlPidWhere += " AND A.STARTDATE <= GETDATE()";
        }        
        SqlPidWhere += " AND A.PIDSTATUS <> 3";
        
        if (record.isShowingSameStationGroupJobs) {
            SqlPWorkStation = `SELECT A.PWORKSTATIONID FROM PWORKSTATION A (NOLOCK)
                 WHERE A.COMPANYID = ${record.companyId}
                 AND A.GROUPCODE = (SELECT GROUPCODE FROM PWORKSTATION WHERE COMPANYID = ${record.companyId} AND PWORKSTATIONID = ${record.wsId} )`;            
        }
        else if (record.isShowingSameWorkCenterJobs) {
            SqlPWorkStation = `SELECT A.PWORKSTATIONID FROM PWORKSTATION A (NOLOCK)
                 WHERE A.COMPANYID = ${record.companyId}
                 AND A.PWORKCENTERID = (SELECT B.PWORKCENTERID FROM PWORKSTATION B WHERE B.COMPANYID = ${record.companyId} AND B.PWORKSTATIONID IN ( @SqlPWorkStation ))`;                
        }
       
             
        let query = `DECLARE 
                    @SqlPWorkStation VARCHAR(100)        
                    SELECT @SqlPWorkStation = PLINETOP.PWORKSTATIONID 
                    FROM PLINETOP WITH (NOLOCK) 
                    LEFT OUTER JOIN PLINEDET WITH (NOLOCK) ON PLINETOP.COMPANYID = PLINEDET.COMPANYID AND PLINEDET.PLINEID = PLINETOP.PLINEID 
                    WHERE PLINEDET.COMPANYID = ${record.companyId} AND PLINEDET.PWORKSTATIONID = ${record.wsId} 
                    ORDER BY PLINETOP.PLINENO `;

        query = query + ` SELECT ${SqlIsYuklemeSirasi} A.PWORKSTATIONID, PW.PWORKSTATIONNO, A.SORTID, A.PID, A.DESCRIPTION, A.WORKSTARTDATE, A.PSTOPCAUSEID, A.SETUPDURATION, A.EMPDURATION,
            A.SPEED, A.PJOBORDERID, PJB.PROORDERSNO, PJB.TRANSCODE, A.PEQUIPMENTID, PE.PEQUIPMENTNO, A.DURATION, A.FPLANSTARTDATE, A.REQWORKEMPCOUNT, A.ITEMNO, A.PLANSHIFT, A.PLANWEEK, A.PLANDAY, A.PRIORITY,
            A.STOCKID, A.CAPACITY, A.CYCLEUNIT, A.PPROTREEID, A.PPROTREEITEMID, A.PRODUCTNUMBER, A.PRODUCTNUMBER1, A.NOTES, DATEPART(WEEK, A.STARTDATE) HAFTA, PJB.PJOBORDERGROUPNO, PJB.PJOBORDERGROUPORDERNO, PJB.RECEIPTNO,
            (SELECT TOP 1 B.STOCKNO FROM VE_PPRODUCTPLANITEM B (NOLOCK) WHERE A.COMPANYID = B.COMPANYID AND A.PID = B.PID) STOCKNO, 
            (SELECT TOP 1 B.STOCKNAME FROM VE_PPRODUCTPLANITEM B (NOLOCK) WHERE A.COMPANYID = B.COMPANYID AND A.PID = B.PID) STOCKNAME, 
            A.CYCLEPERIOD, A.CYCLEOFCOE, A.CYCLEOFPULSE, A.STARTDATE, A.GROUPCODE, A.SPECCODE1, A.SPECCODE2, 
            A.QUANTITY ORJQTY, A.QUANTITY2 ORJQTY2, A.QUANTITY3 ORJQTY3, A.PQUANTITY, A.PQUANTITY2, A.PQUANTITY3, 
            A.QUANTITY - ${SqlUretilen} QUANTITY, A.QUANTITY2 - ${SqlUretilen}2 QUANTITY2, A.QUANTITY3 - ${SqlUretilen}3 QUANTITY3, 
            ${SqlPorderNo}, A.PPROCESSID, P.PPROCESSNO, P.PPROCESSNAME, ${SqlUreSipBilgi}, ${SqlSipBilgi} FROM PPRODUCTPLANWS A (NOLOCK)
            LEFT JOIN PPROCESS P ON A.COMPANYID = P.COMPANYID AND A.PPROCESSID = P.PPROCESSID
            LEFT JOIN PEQUIPMENT PE ON A.COMPANYID = PE.COMPANYID AND A.PEQUIPMENTID = PE.PEQUIPMENTID
            LEFT JOIN PWORKSTATION PW ON A.COMPANYID = PW.COMPANYID AND A.PWORKSTATIONID = PW.PWORKSTATIONID
            LEFT JOIN PJOBORDERPROT PJB ON A.COMPANYID = PJB.COMPANYID AND A.PJOBORDERID = PJB.RECEIPTID
            WHERE A.COMPANYID = ${record.companyId}
            ${SqlPidWhere} AND ISNULL(A.PPARENTID, 0) > 0`;

        if(SqlPWorkStation.length === 0) {
            SqlPWorkStation = "@SqlPWorkStation";
        }
        if (!record.IsProducedQuantityConditionDisabled) {
            query += ` AND A.QUANTITY - ${SqlUretilen} > 0 \n`;
        }
        if (record.isLineProductionEnabled && record.isFinishingPlanWhenCompleted) {
            query += ` AND (A.QUANTITY - (SELECT ISNULL(SUM(QUANTITY),0) PQTY FROM PRECEIPTOT WITH (NOLOCK) WHERE COMPANYID = A.COMPANYID AND PID = A.PID AND PWORKSTATIONID = ${record.wsId} )) > 0 ` ;
        }        
        query += ` AND A.PWORKSTATIONID IN (${SqlPWorkStation} )\n`;

        
        if (record.isCheckingPreviousOperationWorkingControl && record.isCheckingPreviousOperationProductionControl) {
            query += ` AND (CASE WHEN PJB.PPARENTID != 0 THEN (SELECT SUM(ISNULL(QUANTITY,0)) FROM PRECEIPTOT NOLOCK WHERE COMPANYID = PJB.COMPANYID AND PJOBORDERID = PJB.PPARENTID) ELSE 1 END > 0 
                       OR  EXISTS(SELECT 1 FROM PWSSTATUS S WITH(NOLOCK)  INNER JOIN PPRODUCTPLANITEM P WITH(NOLOCK) ON P.COMPANYID = S.COMPANYID AND P.PID = S.PJOBID 
                       WHERE S.COMPANYID = A.COMPANYID AND P.PJOBORDERID = PJB.PPARENTID)) \n`; 
        }
        else if (record.isCheckingPreviousOperationProductionControl) {
            query += ` AND (CASE WHEN PJB.PPARENTID != 0 THEN (SELECT SUM(ISNULL(QUANTITY,0)) FROM PRECEIPTOT NOLOCK WHERE COMPANYID = PJB.COMPANYID AND PJOBORDERID = PJB.PPARENTID) ELSE 1 END > 0 )`;
        }
        else if (record.isCheckingPreviousOperationWorkingControl) {
            query += ` AND EXISTS (SELECT 1 FROM PWSSTATUS S WITH (NOLOCK)  INNER JOIN PPRODUCTPLANITEM P WITH (NOLOCK) ON P.COMPANYID=S.COMPANYID AND P.PID = S.PJOBID 
                        WHERE S.COMPANYID = A.COMPANYID AND P.PJOBORDERID = PJB.PPARENTID) ` ;
        }

        query += " ORDER BY A.STARTDATE, ISNULL(A.SORTID,A.PID)"; 

        return query;
    }

    function sqlGenerateStopCauseListQuery(record) {
        let query = `DECLARE 
        @ACILIS_DURUS NVARCHAR(100),
        @ARKAEKIPMAN_DURUS NVARCHAR(100),
        @ONEKIPMAN_DURUS NVARCHAR(100),
        @PLANYOK_DURUS NVARCHAR(100),
        @NOCONNECTION_DURUS NVARCHAR(100),
        @VARDIYAYOK_DURUS NVARCHAR(100),
        @SHIFTEDSHIFT_DURUS NVARCHAR(100)
                
        select @ACILIS_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_ACILISDURUS' and COMPANYID = ${record.companyId}
        select @ARKAEKIPMAN_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_ARKAEKIPMANDURUSU' and COMPANYID = ${record.companyId}
        select @ONEKIPMAN_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_ONEKIPMANDURUSU' and COMPANYID = ${record.companyId}
        select @PLANYOK_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_PLANYOK' and COMPANYID = ${record.companyId}
        select @NOCONNECTION_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_NOCONNECTION' and COMPANYID = ${record.companyId}
        select @VARDIYAYOK_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_VARDIYAYOKDURUSU' and COMPANYID = ${record.companyId}
        select @SHIFTEDSHIFT_DURUS = PARAMVALUE from UPSYSPARAM where PARAMNAME='PSTOPCAUSEID_SHIFTEDSHIFT' and COMPANYID = ${record.companyId}
                
        SELECT A.*
            ,B.PSTOPCAUSENO
            ,B.PSTOPCAUSENAME
            ,B.GROUPCODE
        FROM PSTOPCAUSEWS A
        INNER JOIN PSTOPCAUSE B ON A.COMPANYID = B.COMPANYID
            AND A.PSTOPCAUSEID = B.PSTOPCAUSEID
        WHERE A.COMPANYID = ${record.companyId}
            AND B.STATUS = 2
            AND A.PWORKSTATIONID = ${record.wsId} 
            AND A.PSTOPCAUSEID NOT IN (@ACILIS_DURUS,@ARKAEKIPMAN_DURUS, @ONEKIPMAN_DURUS,@PLANYOK_DURUS,
            @NOCONNECTION_DURUS,@VARDIYAYOK_DURUS,@SHIFTEDSHIFT_DURUS)`;

        return query;

    }

    function sqlGeneratePWorkstationListQuery(record) {
        let query = `select PWS.PWORKSTATIONID, PWS.PWORKSTATIONNO, 
                    PWS.PWORKSTATIONNAME from PLINEDET PL inner join PWORKSTATION PWS 
                    on PL.COMPANYID = PWS.COMPANYID and PL.PWORKSTATIONID = PWS.PWORKSTATIONID
                    where PWS.COMPANYID= ${record.companyId} and PWS.STATUS = 2`;
        return query;
    }

    function sqlGenerateStationStatusQuery(record) {
        let query = `
        SELECT P.COMPANYID
            ,P.PWORKSTATIONID
            ,P.PEQUIPMENTID
            ,P.CPERIODID
            ,TE.EMPLOYEEID
            ,P.PJOBID
            ,P.PJOBORDERID
            ,P.QUANTITY
            ,P.QUANTITY2
            ,P.QUANTITY3
            ,P.LASTQTY
            ,P.LASTQTY2
            ,P.LASTQTY3
            ,P.LOADED
            ,P.STOPPED
            ,P.STOPTYPE
            ,P.PSTOPCAUSEID
            ,P.STARTTIME
            ,P.STOPTIME
            ,P.DURATION
            ,P.STOPDUR
            ,P.WSSTATUS
            ,P.STOPDURT
            ,P.PLANSTOPTIME
            ,P.NOTPLANSTOPTIME
            ,P.SPEED
            ,P.SPEEDUNIT
            ,P.HOURQUNIT
            ,P.HOURQUANTITY
            ,P.WORKTIME
            ,P.SHIFT
            ,P.SHIFTID
            ,P.EMPCHANGEDATE
            ,P.EMPCHANGEQTY
            ,P.AVGSPEED
            ,P.RANDIMAN
            ,P.CLIVERSION
            ,P.ACYCLEPERIOD
            ,P.INSERTDATE
            ,E.EMPLOYEENO AS EMPLOYEENO
            ,E.EMPLOYEENAME AS EMPLOYEENAME
            ,WS.PWORKSTATIONNO AS PWORKSTATIONNO
            ,WS.PWORKSTATIONNAME AS PWORKSTATIONNAME
            ,WS.STATUS AS ISISTASYONUDURUM
            ,WC.PWORKCENTERID AS PWORKCENTERID
            ,WC.PWORKCENTERNO AS PWORKCENTERNO
            ,WC.PWORKCENTERNAME AS PWORKCENTERNAME
            ,DBO.[GET_JO_RECEIPTNO_FOR_PID](P.COMPANYID, P.CPERIODID, P.PJOBID) RECEIPTNO
            ,DBO.[GET_JO_STOCKNO_FOR_PID](P.COMPANYID, P.CPERIODID, P.PJOBID) STOCKNO
            ,DBO.[GET_JO_STOCKNAME_FOR_PID](P.COMPANYID, P.CPERIODID, P.PJOBID) STOCKNAME
            ,DBO.[GET_JO_QTYPRO_FOR_PID](P.COMPANYID, P.CPERIODID, P.PJOBID) AS ISEMRIURETIMMIKTAR
            ,R.STOCKID
            ,R.GRADEID AS GRADEID
            ,R.GRADENAME AS GRADENAME
            ,R.PEQUIPMENTNO AS PEQUIPMENTNO
            ,R.PEQUIPMENTNAME AS PEQUIPMENTNAME
            ,R.PPROCESSNO AS PPROCESSNO
            ,R.PPROCESSNAME AS PPROCESSNAME
            ,R.PPROTREEID AS PPROTREEID
            ,SC.PSTOPCAUSENO
            ,SC.PSTOPCAUSENAME
            ,R.QUANTITY AS ISEMRIMIKTAR
            ,R.DESCRIPTION AS ISACIKLAMA
            ,R.PQUANTITY
            ,R.PQUANTITY2
            ,R.PQUANTITY3
            ,R.SPEED AS PLANSPEED
            ,R.CYCLEUNIT AS CYCLEUNIT
            ,R.CYCLEPERIOD AS CYCLEPERIOD
            ,R.CYCLEOFCOE AS CYCLEOFCOE
            ,R.COFSOCKET AS COFSOCKET
            ,R.PROCMULT AS PROCMULT
            ,PWSO.A AS AVAIBILITY
            ,PWSO.P AS PERFORMANS
            ,PWSO.Q AS QUALITY
            ,PWSO.OEE AS OEE
            ,DATEDIFF(MINUTE, P.INSERTDATE, GETDATE()) AS BAGLANTI
            ,(
                SELECT SUM(PI.PQUANTITY * ISNULL(PI.CYCLEPERIOD, 0))
                FROM PPRODUCTPLANITEM PI(NOLOCK)
                WHERE PI.COMPANYID = R.COMPANYID
                    AND PI.PID = R.PID
                ) AS CALISILANZAMAN
            ,P.LOSSQTY ISKARTA
            ,ISNULL(PL.PLINEID, 0) PLINEID
            ,UNIT.UNITID
            ,UNIT.UNITNAME
            ,UNIT.UNITID2
            ,UNIT.UNITNAME2
            ,UNIT.UNITID3
            ,UNIT.UNITNAME3
            ,PSH.NOTWORKING
            ,CASE 
                WHEN P.PSTOPCAUSEID = - 999
                    THEN NULL
                ELSE DATEDIFF(second, P.STOPTIME, getdate())
                END STOPSTARTTIME
        FROM VE_PWSSTATUS AS P(NOLOCK)
        LEFT OUTER JOIN VE_PPRODUCTPLANWS AS R(NOLOCK) ON P.COMPANYID = R.COMPANYID
            AND P.PJOBID = R.PID
        LEFT OUTER JOIN PWORKCENTER AS WC(NOLOCK)
        INNER JOIN PWORKSTATION AS WS(NOLOCK) ON WC.PWORKCENTERID = WS.PWORKCENTERID
            AND WC.COMPANYID = WS.COMPANYID ON P.COMPANYID = WS.COMPANYID
            AND P.PWORKSTATIONID = WS.PWORKSTATIONID
            AND WS.STATUS = 2 LEFT OUTER JOIN PWSSTATUSOTHER PWSO(NOLOCK) ON P.COMPANYID = PWSO.COMPANYID
            AND P.PWORKSTATIONID = PWSO.PWORKSTATIONID LEFT OUTER JOIN PSTOPCAUSE SC(NOLOCK) ON P.COMPANYID = SC.COMPANYID
            AND P.PSTOPCAUSEID = SC.PSTOPCAUSEID LEFT OUTER JOIN TEAMEMPLOYEE AS TE(NOLOCK) ON TE.COMPANYID = P.COMPANYID
            AND TE.TEAMEMPLOYEEID = P.EMPLOYEEID LEFT OUTER JOIN.EMPLOYEE AS E(NOLOCK) ON TE.COMPANYID = E.COMPANYID
            AND TE.EMPLOYEEID = E.EMPLOYEEID LEFT OUTER JOIN PLINEDET PL ON WS.COMPANYID = PL.COMPANYID
            AND WS.PWORKSTATIONID = PL.PWORKSTATIONID LEFT JOIN PSHIFTSCHEDULER PSH WITH (NOLOCK) ON PSH.COMPANYID = P.COMPANYID
            AND PSH.PWORKSTATIONID = P.PWORKSTATIONID
            AND P.INSERTDATE BETWEEN PSH.STARTTIME
                AND PSH.FINISHTIME LEFT JOIN (
            SELECT S.COMPANYID
                ,S.STOCKID
                ,S.STOCKNAME
                ,S.UNITID
                ,S.UNITNAME
                ,MAX(ISNULL(CASE 
                            WHEN X.UNITORDERID = 1
                                THEN X.UNITID
                            END, 0)) UNITID2
                ,MAX(ISNULL(CASE 
                            WHEN X.UNITORDERID = 1
                                THEN X.UNITNAME
                            END, '')) UNITNAME2
                ,MAX(ISNULL(CASE 
                            WHEN X.UNITORDERID = 2
                                THEN X.UNITID
                            END, 0)) UNITID3
                ,MAX(ISNULL(CASE 
                            WHEN X.UNITORDERID = 2
                                THEN X.UNITNAME
                            END, '')) UNITNAME3
            FROM VE_STOCK S
            LEFT OUTER JOIN (
                SELECT A.*
                    ,B.STOCKID
                    ,ROW_NUMBER() OVER (
                        PARTITION BY A.COMPANYID
                        ,B.STOCKID ORDER BY A.COMPANYID
                            ,B.STOCKID
                            ,B.ITEMNO
                        ) UNITORDERID
                FROM STOCKUNIT A WITH (NOLOCK)
                INNER JOIN STOCKUNITS B WITH (NOLOCK) ON A.COMPANYID = B.COMPANYID
                    AND A.UNITID = B.UNITID
                WHERE A.COMPANYID = ${record.companyId} 
                ) X ON X.COMPANYID = S.COMPANYID
                AND X.STOCKID = S.STOCKID
            WHERE S.COMPANYID = ${record.companyId} 
            GROUP BY S.COMPANYID
                ,S.STOCKID
                ,S.STOCKNAME
                ,S.UNITID
                ,S.UNITNAME
            ) UNIT ON UNIT.STOCKID = R.STOCKID
            AND UNIT.COMPANYID = R.COMPANYID 
            WHERE 
            P.COMPANYID = ${record.companyId} and
            p.PWORKSTATIONID = ${record.wsId}
            AND WS.STATUS = 2
            AND ISNULL(WS.NOTVISIBLEFACCON, 0) = 0
        ORDER BY P.PWORKSTATIONNO
        `;
        return query;
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
            cperiodId: config.cperiodId,
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
        node.isShowingOnlyJobsToCome = config.isShowingOnlyJobsToCome;
        node.isShowingOnlyPassedJobs = config.isShowingOnlyPassedJobs;
        node.isShowingSameStationGroupJobs = config.isShowingSameStationGroupJobs;
        node.isShowingSameWorkCenterJobs = config.isShowingSameWorkCenterJobs;
        node.isProducedQuantityConditionDisabled = config.isProducedQuantityConditionDisabled;
        node.isLineProduction = config.isLineProduction;
        node.isFinishingPlanWhenCompleted = config.isFinishingPlanWhenCompleted;
        node.isCheckingPreviousOperationWorkingControl = config.isCheckingPreviousOperationWorkingControl;
        node.isCheckingPreviousOperationProductionControl = config.isCheckingPreviousOperationProductionControl;

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
                record.cperiodId = trexmesCN.config.cperiodId;
                record.userId = trexmesCN.config.userId;
                record.cmdId = msg.operationMode;
                record.command = resultCmd.command;
                record.wsId = resultCmd.wsId;
                
                if(resultCmd.isGetFunc) {                    
                    if(record.cmdId == "100") 
                    {    
                        record.isShowingOnlyJobsToCome = node.isShowingOnlyJobsToCome;
                        record.isShowingOnlyPassedJobs = node.isShowingOnlyPassedJobs;
                        record.isShowingSameStationGroupJobs = node.isShowingSameStationGroupJobs;
                        record.isShowingSameWorkCenterJobs = node.isShowingSameWorkCenterJobs;
                        record.isProducedQuantityConditionDisabled = node.isProducedQuantityConditionDisabled;
                        record.isLineProduction = node.isLineProduction;
                        record.isFinishingPlanWhenCompleted = node.isFinishingPlanWhenCompleted;
                        record.isCheckingPreviousOperationWorkingControl = node.isCheckingPreviousOperationWorkingControl;
                        record.isCheckingPreviousOperationProductionControl = node.isCheckingPreviousOperationProductionControl;
                
                        query = sqlGenerateProductionPlanQuery(record);                                            
                    }
                    else if (record.cmdId == "101") {
                        query = sqlGenerateStopCauseListQuery(record);
                    }
                    else if (record.cmdId == "102") {
                        query = sqlGeneratePWorkstationListQuery(record);
                    }
                    else if (record.cmdId == "103") {
                        query = sqlGenerateStationStatusQuery(record);
                    }                    
                }
                else {
                    query = sqlNgpCommandQueInsert(record);
                }
                //node.log("query: " + query);
				
                trexmesCN.execSql("", query, [], {}, function (err, data, info) {
                    if (err) {
                        node.processError(err, msg);
                    } else {
                        if (!resultCmd.isGetFunc) {
                            node.status({
                                fill: 'yellow',
                                shape: 'dot',
                                text: 'Sended, aprove waiting.. '
                            });
                        }
                        else {
                            node.status({
                                fill: 'green',
                                shape: 'dot',
                                text: 'done.'
                            });
                        }
                        setResult(msg, node.outField, data, node.returnType);
                        //node.send(msg);
                        //node.send(msg.payload.length);
                        let commandId = 0;
                        if(msg.payload.length>0) {
                            if(msg.payload[0].maxID) {
                                commandId = msg.payload[0].maxID;
                            }
                        }

                        if (!resultCmd.isGetFunc) {
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
                                        if (msg.payload.length > 0) {
                                            isProcessed = msg.payload[0].ISPROCESSED;
                                            isSuccess = msg.payload[0].ISSUCCESS;
                                            message = msg.payload[0].MESSAGE;
                                        }
                                        node.send(msg);
                                        if (isProcessed == 1 && isSuccess == 1) {
                                            node.status({
                                                fill: 'green',
                                                shape: 'dot',
                                                text: 'done'
                                            });
                                        }
                                        else if (isProcessed == 1 && isSuccess == 0) {
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
                        else {
                            node.send(msg);
                        }
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
