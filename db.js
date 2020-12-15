var axios = require('axios');
const MOMENT = require('moment');

var mongoose = require("mongoose");
var citybusroutesschema = new mongoose.Schema({}, { strict: false });
var citybusroutesmodel = mongoose.model("citybusroutes", citybusroutesschema);
var citybusfullstopsschema = new mongoose.Schema({}, { strict: false });
var citybusfullstopsmodel = mongoose.model("citybusfullstops", citybusfullstopsschema);
var govhkmtrstopschema = new mongoose.Schema({}, { strict: false });
var govhkmtrstopmodel = mongoose.model("govhkmtrstop", govhkmtrstopschema);
var mongoConnection;

var mtrStopSchema = new mongoose.Schema({line:String, bound:String, stationName:String, stationCode: String});
var mtrStopModel = mongoose.model("MtrStop", mtrStopSchema);

async function getCitybusStopByStopId(stopId) {
  await connectMongo();
  let routesByStopId = await citybusfullstopsmodel.find({ 'stop': stopId }, function (err, data) {
    if (err)
      console.log(err);
    else
      console.log(data);
  }
  )
  console.log(`finish mongo call...${JSON.stringify(routesByStopId)}`)
  return routesByStopId
}

async function getEtaByStopRoute(routesOfBusStopFromDb) {

}
async function getCitybusETAByStop(stopId) {
  var routesOfBusStopFromDb = await getCitybusStopByStopId(stopId)
  console.log(`finish`)
  console.log(`finish ${JSON.stringify(routesOfBusStopFromDb)}`)
  var response = []
  for (var i = 0; i < routesOfBusStopFromDb.length; i++) {
    var busCompany = routesOfBusStopFromDb[i].get('company')
    var stopName = routesOfBusStopFromDb[i].get('stopName')
    var stop = stopId
    var route = routesOfBusStopFromDb[i].get('route')
    var direction = routesOfBusStopFromDb[i].get('direction')
    var returnInput = []
    console.log(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/${busCompany}/${stop}/${route}`)
    await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/${busCompany}/${stop}/${route}`, {})
      .then((response) => {

        let eta = ''
        let minutesLeft = ''
        let destination = ''
        if (response.data.data.length > 0) {
          for (var j = 0; j < response.data.data.length; j++) {
            if(response.data.data[j].rmk_en === ""){
              let startTime = (new Date()).toLocaleString("en-US", {timeZone: "Asia/Shanghai"});;
              let endTime = (new Date(response.data.data[j].eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"});
              eta = response.data.data[j].eta
              minutesLeft = 
              TimeDiff(startTime, endTime, 'minutes')
              + ' (' 
              + (new Date(response.data.data[j].eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"})
              + ') '
              destination = response.data.data[j].dest_en
              returnInput.push({
                company: busCompany,
                bound: direction,
                route: routesOfBusStopFromDb[i].route,
                stopName: routesOfBusStopFromDb[i].stopName,
                eta: eta,
                minutesLeft: minutesLeft,
                destination: destination
              })
            }
          }
          if (returnInput.length == 0 ) {
            returnInput.push(Object.assign(routesOfBusStopFromDb[i], {
              company: busCompany,
              eta: '-no scheduled bus-',
              minutesLeft: '-no scheduled bus-',
              destination: direction
            }))
          }
        } else {
          console.log(`no scheduled bus!`)
          routesOfBusStopFromDb[i] = Object.assign(routesOfBusStopFromDb[i], {
            company: busCompany,
            eta: '-no scheduled bus-',
            minutesLeft: '-no scheduled bus-',
            destination: direction
          })
          console.log(`no scheduled bus 2!`)
          returnInput.push(routesOfBusStopFromDb[i])
        }
      })
      response.push({
        stopId: stop,
        stopName: stopName,
        route: route,
        direction: direction,
        company: busCompany,
        eta: returnInput
      })
  }
  return response
  
}

async function getMtrRoutesByMtrStop(mtrStop) {

  // var govhkmtrstopschema = new mongoose.Schema({}, { strict: false });
  // var govhkmtrstopmodel = mongoose.model("govhkmtrstop", govhkmtrstopschema);
  await connectMongo();
  var callback = function (err, data) {
    if (err)
      console.log(err);
    else
      console.log(data);
  }

  // var testPayment = new citybusfullstopsmodel();
  console.log(`mtrStop: ${JSON.stringify(mtrStop)}`)
  var routes = await govhkmtrstopmodel.find({stationCode: mtrStop}, callback)
  //line
  //bound
  console.log(`routes: ${JSON.stringify(routes)}`)
  let responseArr = []
  if (routes.length > 0) {
    for (var route of routes) {
      console.log(`1`)
      let direction = route.get('bound')
      console.log(`2`)
      let stationCode = mtrStop
      console.log(`3`)
      let line =  route.get('line')
      console.log(`4`)
  
      // if (line == 'TKL' || line == 'WRL') {
          if (direction == 'DT') {
            direction = 'down'
      } else {
              direction = 'up'
          
      }
    // }
  
      let data = { "company": "MTR", "boundFor": direction, "stationCode": stationCode, "line": line }
  
      console.log(`5`)
      console.log(`data=${JSON.stringify(data)}`)
      let etaArr = await axios.post(`http://whenarrive.com/getEta`, data, {
        content: JSON,
        content_type: 'application/json',
        expect_type: 'text/plain',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log(`etaArr=${JSON.stringify(etaArr.data)}`)
      for (var eta of etaArr.data) {
      responseArr.push(eta)
      }
    }
    console.log(`responseArr=${JSON.stringify(responseArr)}`)
    let resultString = ``
    for (var element of responseArr) {
      console.log(`element: ${JSON.stringify(element)}`)
      resultString = resultString +
`Train To: ${element.destination} Will Arrive In: ${element.minutesLeft}
`
  }
    return resultString
  } else {
    return 0
  }
  
}



async function getMtrRoutesByMtrStopChinese(mtrStop) {

  // var govhkmtrstopschema = new mongoose.Schema({}, { strict: false });
  // var govhkmtrstopmodel = mongoose.model("govhkmtrstop", govhkmtrstopschema);
  await connectMongo();
  var callback = function (err, data) {
    if (err)
      console.log(err);
    else
      console.log(data);
  }

  // var testPayment = new citybusfullstopsmodel();
  console.log(`mtrStop: ${JSON.stringify(mtrStop)}`)
  var routes = await govhkmtrstopmodel.find({stationChineseName: mtrStop,bound:'DT'}, callback) //to prevent retrieving both DT and UT
  //line
  //bound
  console.log(`routes: ${JSON.stringify(routes)}`)
  let responseArr = []
  if (routes.length > 0) {
    for (var route of routes) {
      console.log(`1`)
      let direction = route.get('bound')
      console.log(`2`)
      let stationCode = route.get('stationCode')
      console.log(`3`)
      let line =  route.get('line')
      console.log(`4`)
  
      if (line == 'AEL' || line == 'TKL' || line == 'TCL' || line == 'WRL') {
      let data = { "company": "MTR", "boundFor": direction, "stationCode": stationCode, "line": line }
  
      console.log(`5`)
      console.log(`data=${JSON.stringify(data)}`)
      console.log(`line=${line}`)
      console.log(`stationCode=${stationCode}`)
      console.log(`mtrStop!=${mtrStop}`)
      let etaArr
        etaArr = await getMtrETA(line, stationCode, mtrStop)
      
      // let etaArr = await getMtrETA('TCL', 'NAC', 'NAM CHEONG')
      console.log(`etaArr=${JSON.stringify(etaArr)}`)
      // for (var eta of etaArr) {
      responseArr.push({
        line: line,
        eta: etaArr
      })
      // }
    }
    }
    console.log(`responseArr=${JSON.stringify(responseArr)}`)
    let resultString = ``
    for (var response of responseArr) {
      console.log(`response=${JSON.stringify(response)}`)
      resultString = resultString + `
${mtrLineCodeToChineseName(response.line)}
   `
      for (var element of response.eta) {
        console.log(`element=${JSON.stringify(element)}`)
        resultString = resultString + `${element.destination}:${splitMinutesLeft(element.minutesLeft)}||`
      }
//       console.log(`element: ${JSON.stringify(element)}`)
//       resultString = resultString +
// `${mtrLineCodeToChineseName(element.route)}Train To: ${element.destination} Will Arrive In: ${element.minutesLeft}
// `
  }
    return resultString
  } else {
    return '只支援 機場快線 / 東涌線 / 將軍澳線 / 西鐵線'
  }
  
}

function splitMinutesLeft(minutesLeft) {
  let minLeft= minutesLeft.split(' ')[0]
  let timeStamp = minutesLeft.split(' ')[1]
  let shortTimeStamp = timeStamp.split(':00 ') [0]
  return minLeft + shortTimeStamp + ')'
}
function mtrLineCodeToChineseName(line) {
  if (line == 'AEL') {
    return '機場快線'
  } else if (line == 'TCL') {
    return '東涌線'
  } else if (line == 'TKL') {
    return '將軍澳線'
  } else if (line == 'WRL') {
    return '西鐵線'

  } else {
    return line
  }
}

async function getMtrETA2(line, station, stationName) {
  
  console.log(`...getMtrETA`)
}

async function getMtrETA(line, station, stationName) {
  console.log(`...getMtrETA`)
  console.log(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${station}`)
  let response = await axios.get(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${station}`, {
    params: {
    }
  });
  //below for testing
  // let response = {data:{ "status": 1, "message": "successful", "curr_time": "2020-03-03 15:37:53", "sys_time": "2020-03-03 15:37:53", "isdelay": "N", "data": { "TCL-NAC": { "curr_time": "2020-03-03 15:37:53", "sys_time": "2020-03-03 15:37:53", "UP": [{ "ttnt": "2", "valid": "Y", "plat": "3", "time": "2020-03-03 15:39:00", "source": "-", "dest": "NAC", "seq": "1" }, { "ttnt": "9", "valid": "Y", "plat": "3", "time": "2020-03-03 15:47:00", "source": "+", "dest": "NAC", "seq": "2" }, { "ttnt": "17", "valid": "Y", "plat": "3", "time": "2020-03-03 15:55:00", "source": "+", "dest": "TUC", "seq": "3" }, { "ttnt": "26", "valid": "Y", "plat": "3", "time": "2020-03-03 16:04:00", "source": "+", "dest": "TUC", "seq": "4" }], "DOWN": [{ "ttnt": "0", "valid": "Y", "plat": "4", "time": "2020-03-03 15:37:00", "source": "-", "dest": "HOK", "seq": "1" }, { "ttnt": "6", "valid": "Y", "plat": "4", "time": "2020-03-03 15:43:00", "source": "-", "dest": "HOK", "seq": "2" }, { "ttnt": "15", "valid": "Y", "plat": "4", "time": "2020-03-03 15:52:00", "source": "-", "dest": "HOK", "seq": "3" }, { "ttnt": "22", "valid": "Y", "plat": "4", "time": "2020-03-03 16:00:00", "source": "+", "dest": "HOK", "seq": "4" }] } } }
  // }
  console.log(`mtr response from data.gov.hk= ${JSON.stringify(response.data)}`)
  let responseArr = [];
  let lineStationElement = line + '-' + station
  let upDown = 'UP'
  console.log(`line-station: ${line}-${station}, upDown: ${upDown}`)

  if (response.data.data[`${line}-${station}`][upDown]){
  for (var i = 0; i < (response.data.data[`${line}-${station}`][upDown].length); i++) {
    let destination = await mtrStopByStationCode(line, response.data.data[`${line}-${station}`][upDown][i].dest)
    console.log(`destination: ${JSON.stringify(destination)}`)
    console.log(`destination.stationChineseName: ${destination.get('stationChineseName')}`)
    console.log(`upDown: ${upDown}`)
    console.log(`line: ${line}`)
    console.log(`line: ${line}` + response.data.data[`${line}-${station}`][upDown][i].dest)
    console.log(`line: ${line}` + response.data.data[`${line}-${station}`][upDown][i].time)
    console.log(`line: ${line}` + response.data.data[`${line}-${station}`][upDown][i].ttnt + ' (' + (new Date(response.data.data[`${line}-${station}`][upDown][i].time)).toLocaleTimeString() + ') ')
    
    console.log(`stopName: ${stationName}`)
    console.log(`destination.get('stationChineseName'): ${destination.get('stationChineseName')}`)
    let data = {
      company: 'MTR',
      bound: upDown,
      route: line,
      dir: response.data.data[`${line}-${station}`][upDown][i].dest,
      eta: response.data.data[`${line}-${station}`][upDown][i].time,
      minutesLeft: response.data.data[`${line}-${station}`][upDown][i].ttnt + ' (' + (new Date(response.data.data[`${line}-${station}`][upDown][i].time)).toLocaleTimeString() + ') ',
      stopName: stationName,
      destination: destination.get('stationChineseName')
    }
    console.log('data from backend = ' + JSON.stringify(data))
    responseArr.push(
      data
    )
  }
}

  
  upDown = 'DOWN'
  
  if (response.data.data[`${line}-${station}`][upDown]){
  for (var i = 0; i < (response.data.data[`${line}-${station}`][upDown].length); i++) {
    let destination = await mtrStopByStationCode(line, response.data.data[`${line}-${station}`][upDown][i].dest)
    console.log(`destination: ${JSON.stringify(destination)}`)
    console.log(`destination.stationChineseName: ${destination.get('stationChineseName')}`)
    let data = {
      company: 'MTR',
      bound: upDown,
      route: line,
      dir: response.data.data[`${line}-${station}`][upDown][i].dest,
      eta: response.data.data[`${line}-${station}`][upDown][i].time,
      minutesLeft: response.data.data[`${line}-${station}`][upDown][i].ttnt + ' (' + (new Date(response.data.data[`${line}-${station}`][upDown][i].time)).toLocaleTimeString() + ') ',
      stopName: stationName,
      destination: destination.get('stationChineseName')
    }
    console.log('data from backend = ' + JSON.stringify(data))
    responseArr.push(
      data
    )
  }
  }
  
  return responseArr

}



async function mtrStopByStationCode (route, stationCode) {

  await connectMongo();
  
  console.log(`route: ${route}, stationCode: ${stationCode}`)
  // var callback = function(err,data){
  //   if(err)
  //     console.log(`error: ${err}`);
  //   else
  //     console.log(`data: ${data}`);
  // }
  mongoose.Promise = global.Promise;
  const stop = await mtrStopModel.findOne({'line':route, 'stationCode':stationCode}, function (err, obj) { console.log(`data ${JSON.stringify(obj)}`); });
  console.log(`stops: ${JSON.stringify(stop)}`)
  return stop;
}

////////////////////////

const TimeDiff = (startTime, endTime, format) => {

  startTime = MOMENT(startTime, 'MM/DD/YYYY, HH:mm:ss A');
  endTime = MOMENT(endTime, 'MM/DD/YYYY, HH:mm:ss A');
  return endTime.diff(startTime, format);
}

async function connectMongo() {
  if (mongoConnection == null) {
   mongoConnection = await mongoose.connect("mongodb+srv://admin:dbUserPassword@cluster0-fjcyn.mongodb.net/test?retryWrites=true&w=majority");
   console.log(`first connection to mongo`)
 } else {
   console.log(`connection to mongo already exists`)
 }
}

module.exports = {
  getCitybusETAByStop: getCitybusETAByStop,
  getMtrRoutesByMtrStop:getMtrRoutesByMtrStop,
  getMtrRoutesByMtrStopChinese: getMtrRoutesByMtrStopChinese
};