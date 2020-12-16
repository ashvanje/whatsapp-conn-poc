var axios = require('axios');
const MOMENT = require('moment');
var emoji = require('node-emoji')
const _ = require("lodash")

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
  await connectMongo();
  //Get all routes in a station by Chinese station name
  var routes = await govhkmtrstopmodel.find({ stationChineseName: mtrStop, bound: 'DT' }, function (err, data) {
    if (err)
      console.log(err);
    else
      console.log(data);
  }) //to prevent retrieving both DT and UT
  let responseArr = []
  if (routes.length > 0) {
    //For each route, get the MTR ETA
    for (var route of routes) {
      let stationCode = route.get('stationCode')
      let line = route.get('line')

      //Only get ETA if the line is supported
      if (line == 'AEL' || line == 'TKL' || line == 'TCL' || line == 'WRL') {
        let etaArr = await getMtrETA(line, stationCode, mtrStop)
        responseArr.push({
          line: line,
          eta: etaArr // [{direction:up, eta: [{station:xx, eta:},{}...]}, {direction: down, eta...}]
        })
      }
    } // end of looping routes in a station
    console.log(`responseArr: ${JSON.stringify(responseArr, null, 2)}`)
    return returnResponseForMtrEta(responseArr)
  } else {
    return '只支援 _機場快線_ / 東涌線 / 將軍澳線 / 西鐵線' + emoji.find('train').emoji
  }
  
}

function returnResponseForMtrEta(responseArr) {
  let resultString = ``
  for (var response of responseArr) { //loop line
    resultString = resultString + `
${mtrLineCodeToChineseName(response.line) + emoji.find('train').emoji} 往 
`
    if (response.eta[0].eta.length > 0) { //handle up
      for (var element of response.eta[0].eta) { //handle each station of up e.g. lohas park and TKO
        //element example: {station:'LOHAS PARK', eta: {destination, minutesLeft...}}
        resultString = resultString + `${element.station} `
        for (var eta of element.eta) {
          resultString = resultString + `${splitMinutesLeft(eta.minutesLeft)} `
        }
        resultString = resultString + `
`
      }
    }

    if (response.eta[1].eta.length > 0) {
      for (var element of response.eta[1].eta) { //loop station e.g. lohas park and TKO
        //element example: {station:'LOHAS PARK', eta: {destination, minutesLeft...}}
        resultString = resultString + `${element.station} `
        for (var eta of element.eta) {
          resultString = resultString + `${splitMinutesLeft(eta.minutesLeft)} `
        }
        resultString = resultString + `
`
      }
    }
  }
  return resultString
}

function splitMinutesLeft(minutesLeft) {
  let minLeft= minutesLeft.split(' ')[0]
  let timeStamp = minutesLeft.split(' ')[1]
  let shortTimeStamp = timeStamp.split(':00') [0]
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

async function getMtrETA(line, station, stationName) {
  console.log(`...getMtrETA`)
  console.log(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${station}`)
  let response = await axios.get(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${station}`, {
    params: {
    }
  });
  console.log(`mtr response from data.gov.hk= ${JSON.stringify(response.data)}`)
  let upArr = [];
  let upDown = 'UP'

  if (response.data.data[`${line}-${station}`][upDown]) {
    for (var i = 0; i < (response.data.data[`${line}-${station}`][upDown].length); i++) {
      let destination = await mtrStopByStationCode(line, response.data.data[`${line}-${station}`][upDown][i].dest)
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
      upArr.push(
        data
      )
    }
  }
  // groupByDestination(upArr)
  upDown = 'DOWN'

  let downArr = [];
  if (response.data.data[`${line}-${station}`][upDown]) {
    for (var i = 0; i < (response.data.data[`${line}-${station}`][upDown].length); i++) {
      let destination = await mtrStopByStationCode(line, response.data.data[`${line}-${station}`][upDown][i].dest)
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
      downArr.push(
        data
      )
    }
  }

  return [
    {direction:'up',eta:groupByDestination(upArr)},
    {direction:'down',eta:groupByDestination(downArr)}
  ]

}


function groupByDestination (array) {
  let resultArr = []
  let etaGroupedByStation = _.groupBy(array, 'destination')
  var uniq = _.uniq(_.map(array, 'destination'))
  console.log(`etaGroupedByStation: ${JSON.stringify(etaGroupedByStation)}`)
  console.log(`uniq: ${JSON.stringify(uniq)}`)
  for(var station of uniq) {
    let etaOfStation = etaGroupedByStation[station]
    resultArr.push({
      station: station,
      eta: etaOfStation
    })
  }
  console.log(`resultArr: ${JSON.stringify(resultArr, null, 2)}`)
  return resultArr
  // for (var element of array) {
  //   if (element.isGrouped != true) {
  //     resultArr.push(
  //       {
          
  //       }
  //     )
  //   }
  // }
}

async function mtrStopByStationCode(route, stationCode) {
  await connectMongo();
  console.log(`route: ${route}, stationCode: ${stationCode}`)
  mongoose.Promise = global.Promise;
  const stop = await mtrStopModel.findOne({ 'line': route, 'stationCode': stationCode }, function (err, obj) { console.log(`data ${JSON.stringify(obj)}`); });
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