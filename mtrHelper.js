var axios = require('axios');
const MOMENT = require('moment');
var emoji = require('node-emoji')
const _ = require("lodash")

const mtrStops = require('./data/mtrStops')

var mongoose = require("mongoose");
var govhkmtrstopschema = new mongoose.Schema({}, { strict: false });
var govhkmtrstopmodel = mongoose.model("govhkmtrstop", govhkmtrstopschema);
var mongoConnection;

var mtrStopSchema = new mongoose.Schema({line:String, bound:String, stationName:String, stationCode: String});
var mtrStopModel = mongoose.model("MtrStop", mtrStopSchema);

async function getMtrRoutesByMtrStopChinese(mtrStop) {
  await connectMongo();
  var routes = mtrStops.findMtrStopsByStationName(mtrStop, null, 'DT')
  console.log(`routes: ${JSON.stringify(routes)}`)
  if (routes.length == 0) {
    routes = mtrStops.findMtrStopsByStationName(null, mtrStop, 'DT')
  }
  let responseArr = []
  if (routes.length > 0) {
    //For each route, get the MTR ETA
    for (var route of routes) {
      console.log(`loop route: ${JSON.stringify(route)}`)
      let stationCode = route.stationCode // if mongo, need to change to .get('stationCode')
      let line = route.line
      console.log(`loop route finish}`)

      //Only get ETA if the line is supported
      if (line == 'AEL' || line == 'TKL' || line == 'TCL' || line == 'WRL') {
        console.log(`line: ${line} get MtrEta`)
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
        resultString = resultString + `${element.station} ${element.stationEn} `
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
        resultString = resultString + `${element.station} ${element.stationEn} `
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
    return '機場快線 Airport Express'
  } else if (line == 'TCL') {
    return '東涌線 Tung Chung Line'
  } else if (line == 'TKL') {
    return '將軍澳線 Tseung Kwan O Line'
  } else if (line == 'WRL') {
    return '西鐵線 West Rail Line'
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
      
      console.log(`destination: ${JSON.stringify(destination)}`)
      let data = {
        company: 'MTR',
        bound: upDown,
        route: line,
        dir: response.data.data[`${line}-${station}`][upDown][i].dest,
        eta: response.data.data[`${line}-${station}`][upDown][i].time,
        minutesLeft: response.data.data[`${line}-${station}`][upDown][i].ttnt + ' (' + (new Date(response.data.data[`${line}-${station}`][upDown][i].time)).toLocaleTimeString() + ') ',
        stopName: stationName,
        destination: destination.stationChineseName,
        destinationEn: destination.stationName
      }
      console.log(`data: ${JSON.stringify(data)}`)
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
        destination: destination.stationChineseName,
        destinationEn: destination.stationName
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
  for(var station of uniq) { //protected etaOfStation length > 0
    let etaOfStation = etaGroupedByStation[station]
    resultArr.push({
      station: station,
      stationEn: etaOfStation[0].destinationEn,
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
  // const stop = await mtrStopModel.findOne({ 'line': route, 'stationCode': stationCode }, function (err, obj) { console.log(`data ${JSON.stringify(obj)}`); });
  const stop = mtrStops.findMtrStopsByStationCode(stationCode)
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
  getMtrRoutesByMtrStopChinese: getMtrRoutesByMtrStopChinese
};