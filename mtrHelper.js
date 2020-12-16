var axios = require('axios');
const MOMENT = require('moment');
var emoji = require('node-emoji')
const _ = require("lodash")

var mongoose = require("mongoose");
var govhkmtrstopschema = new mongoose.Schema({}, { strict: false });
var govhkmtrstopmodel = mongoose.model("govhkmtrstop", govhkmtrstopschema);
var mongoConnection;

var mtrStopSchema = new mongoose.Schema({line:String, bound:String, stationName:String, stationCode: String});
var mtrStopModel = mongoose.model("MtrStop", mtrStopSchema);

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
  // var routes = await govhkmtrstopmodel.find({ stationChineseName: mtrStop, bound: 'DT' }, function (err, data) {
  //   if (err)
  //     console.log(err);
  //   else
  //     console.log(data);
  // }) //to prevent retrieving both DT and UT

  var routes = findGovHkMtrStops(mtrStop, null, 'DT')
  console.log(`routes: ${JSON.stringify(routes)}`)
  if (routes.length == 0) {
    // routes = await govhkmtrstopmodel.find({ stationName: mtrStop, bound: 'DT' }, function (err, data) {
    //   if (err)
    //     console.log(err);
    //   else
    //     console.log(data);
    // }) //to prevent retrieving both DT and UT
    routes = findGovHkMtrStops(null, mtrStop, 'DT')
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
  const stop = findMtrStops(route,stationCode)
  console.log(`stops: ${JSON.stringify(stop)}`)
  let result
  if (stop.length > 0) {
    result = stop[0]
    console.log(`stop[0]: ${JSON.stringify(stop[0])}`)
  }
  return result;
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


function findMtrStops(route, stationCode) {
  let mtrStops = [{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfdd"
    },
    "line": "AEL",
    "bound": "down",
    "stationCode": "AWE",
    "stationId": "56",
    "stationChineseName": "博覽館",
    "stationName": "AsiaWorld-Expo",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfde"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "AIR",
    "stationId": "47",
    "stationChineseName": "機場",
    "stationName": "Airport",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfdf"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "TSY",
    "stationId": "46",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe0"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "KOW",
    "stationId": "45",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe1"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "HOK",
    "stationId": "44",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe2"
    },
    "line": "AEL",
    "bound": "up",
    "stationCode": "HOK",
    "stationId": "44",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe3"
    },
    "line": "AEL",
    "bound": "up",
    "stationCode": "KOW",
    "stationId": "45",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe4"
    },
    "line": "AEL",
    "bound": "up",
    "stationCode": "TSY",
    "stationId": "46",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe5"
    },
    "line": "AEL",
    "bound": "up",
    "stationCode": "AIR",
    "stationId": "47",
    "stationChineseName": "機場",
    "stationName": "Airport",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe6"
    },
    "line": "AEL",
    "bound": "up",
    "stationCode": "AWE",
    "stationId": "56",
    "stationChineseName": "博覽館",
    "stationName": "AsiaWorld-Expo",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe7"
    },
    "line": "DRL",
    "bound": "DT",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe8"
    },
    "line": "DRL",
    "bound": "DT",
    "stationCode": "DIS",
    "stationId": "55",
    "stationChineseName": "迪士尼",
    "stationName": "Disneyland Resort",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfe9"
    },
    "line": "DRL",
    "bound": "up",
    "stationCode": "DIS",
    "stationId": "55",
    "stationChineseName": "迪士尼",
    "stationName": "Disneyland Resort",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfea"
    },
    "line": "DRL",
    "bound": "up",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfeb"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "LOW",
    "stationId": "76",
    "stationChineseName": "羅湖",
    "stationName": "Lo Wu",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfec"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfed"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfee"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfef"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff0"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff1"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff2"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff3"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff4"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff5"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff6"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff7"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "LMC",
    "stationId": "78",
    "stationChineseName": "落馬洲",
    "stationName": "Lok Ma Chau",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff8"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cff9"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cffa"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cffb"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cffc"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cffd"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cffe"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857cfff"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d000"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d001"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d002"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d003"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d004"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d005"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d006"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d007"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d008"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d009"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d00a"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d00b"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d00c"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d00d"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d00e"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "LMC",
    "stationId": "78",
    "stationChineseName": "落馬洲",
    "stationName": "Lok Ma Chau",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d00f"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d010"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d011"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d012"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d013"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d014"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d015"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d016"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d017"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d018"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d019"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d01a"
    },
    "line": "EAL",
    "bound": "up",
    "stationCode": "LOW",
    "stationId": "76",
    "stationChineseName": "羅湖",
    "stationName": "Lo Wu",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d01b"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "CHW",
    "stationId": "37",
    "stationChineseName": "柴灣",
    "stationName": "Chai Wan",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d01c"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "HFC",
    "stationId": "36",
    "stationChineseName": "杏花邨",
    "stationName": "Heng Fa Chuen",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d01d"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SKW",
    "stationId": "35",
    "stationChineseName": "筲箕灣",
    "stationName": "Shau Kei Wan",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d01e"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SWH",
    "stationId": "34",
    "stationChineseName": "西灣河",
    "stationName": "Sai Wan Ho",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d01f"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "TAK",
    "stationId": "33",
    "stationChineseName": "太古",
    "stationName": "Tai Koo",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d020"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d021"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d022"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "FOH",
    "stationId": "30",
    "stationChineseName": "炮台山",
    "stationName": "Fortress Hill",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d023"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "TIH",
    "stationId": "29",
    "stationChineseName": "天后",
    "stationName": "Tin Hau",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d024"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "CAB",
    "stationId": "28",
    "stationChineseName": "銅鑼灣",
    "stationName": "Causeway Bay",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d025"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "WAC",
    "stationId": "27",
    "stationChineseName": "灣仔",
    "stationName": "Wan Chai",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d026"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d027"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d028"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SHW",
    "stationId": "26",
    "stationChineseName": "上環",
    "stationName": "Sheung Wan",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d029"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SYP",
    "stationId": "81",
    "stationChineseName": "西營盤",
    "stationName": "Sai Ying Pun",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d02a"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "HKU",
    "stationId": "82",
    "stationChineseName": "香港大學",
    "stationName": "HKU",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d02b"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "KET",
    "stationId": "83",
    "stationChineseName": "堅尼地城",
    "stationName": "Kennedy Town",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d02c"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "KET",
    "stationId": "83",
    "stationChineseName": "堅尼地城",
    "stationName": "Kennedy Town",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d02d"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "HKU",
    "stationId": "82",
    "stationChineseName": "香港大學",
    "stationName": "HKU",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d02e"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "SYP",
    "stationId": "81",
    "stationChineseName": "西營盤",
    "stationName": "Sai Ying Pun",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d02f"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "SHW",
    "stationId": "26",
    "stationChineseName": "上環",
    "stationName": "Sheung Wan",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d030"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d031"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d032"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "WAC",
    "stationId": "27",
    "stationChineseName": "灣仔",
    "stationName": "Wan Chai",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d033"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "CAB",
    "stationId": "28",
    "stationChineseName": "銅鑼灣",
    "stationName": "Causeway Bay",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d034"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "TIH",
    "stationId": "29",
    "stationChineseName": "天后",
    "stationName": "Tin Hau",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d035"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "FOH",
    "stationId": "30",
    "stationChineseName": "炮台山",
    "stationName": "Fortress Hill",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d036"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d037"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d038"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "TAK",
    "stationId": "33",
    "stationChineseName": "太古",
    "stationName": "Tai Koo",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d039"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "SWH",
    "stationId": "34",
    "stationChineseName": "西灣河",
    "stationName": "Sai Wan Ho",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d03a"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "SKW",
    "stationId": "35",
    "stationChineseName": "筲箕灣",
    "stationName": "Shau Kei Wan",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d03b"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "HFC",
    "stationId": "36",
    "stationChineseName": "杏花邨",
    "stationName": "Heng Fa Chuen",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d03c"
    },
    "line": "ISL",
    "bound": "up",
    "stationCode": "CHW",
    "stationId": "37",
    "stationChineseName": "柴灣",
    "stationName": "Chai Wan",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d03d"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d03e"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d03f"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "LAT",
    "stationId": "38",
    "stationChineseName": "藍田",
    "stationName": "Lam Tin",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d040"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "KWT",
    "stationId": "15",
    "stationChineseName": "觀塘",
    "stationName": "Kwun Tong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d041"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "NTK",
    "stationId": "14",
    "stationChineseName": "牛頭角",
    "stationName": "Ngau Tau Kok",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d042"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "KOB",
    "stationId": "13",
    "stationChineseName": "九龍灣",
    "stationName": "Kowloon Bay",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d043"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "CHH",
    "stationId": "12",
    "stationChineseName": "彩虹",
    "stationName": "Choi Hung",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d044"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "DIH",
    "stationId": "11",
    "stationChineseName": "鑽石山",
    "stationName": "Diamond Hill",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d045"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "WTS",
    "stationId": "10",
    "stationChineseName": "黃大仙",
    "stationName": "Wong Tai Sin",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d046"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "LOF",
    "stationId": "9",
    "stationChineseName": "樂富",
    "stationName": "Lok Fu",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d047"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d048"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "SKM",
    "stationId": "7",
    "stationChineseName": "石硤尾",
    "stationName": "Shek Kip Mei",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d049"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d04a"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d04b"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d04c"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "HOM",
    "stationId": "84",
    "stationChineseName": "何文田",
    "stationName": "Ho Man Tin",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d04d"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "WHA",
    "stationId": "85",
    "stationChineseName": "黃埔",
    "stationName": "Whampo",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d04e"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "WHA",
    "stationId": "85",
    "stationChineseName": "黃埔",
    "stationName": "Whampo",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d04f"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "HOM",
    "stationId": "84",
    "stationChineseName": "何文田",
    "stationName": "Ho Man Tin",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d050"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d051"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d052"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d053"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "SKM",
    "stationId": "7",
    "stationChineseName": "石硤尾",
    "stationName": "Shek Kip Mei",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d054"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d055"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "LOF",
    "stationId": "9",
    "stationChineseName": "樂富",
    "stationName": "Lok Fu",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d056"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "WTS",
    "stationId": "10",
    "stationChineseName": "黃大仙",
    "stationName": "Wong Tai Sin",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d057"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "DIH",
    "stationId": "11",
    "stationChineseName": "鑽石山",
    "stationName": "Diamond Hill",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d058"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "CHH",
    "stationId": "12",
    "stationChineseName": "彩虹",
    "stationName": "Choi Hung",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d059"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "KOB",
    "stationId": "13",
    "stationChineseName": "九龍灣",
    "stationName": "Kowloon Bay",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d05a"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "NTK",
    "stationId": "14",
    "stationChineseName": "牛頭角",
    "stationName": "Ngau Tau Kok",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d05b"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "KWT",
    "stationId": "15",
    "stationChineseName": "觀塘",
    "stationName": "Kwun Tong",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d05c"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "LAT",
    "stationId": "38",
    "stationChineseName": "藍田",
    "stationName": "Lam Tin",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d05d"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d05e"
    },
    "line": "KTL",
    "bound": "up",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d05f"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "WKS",
    "stationId": "103",
    "stationChineseName": "烏溪沙",
    "stationName": "Wu Kai Sha",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d060"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "MOS",
    "stationId": "102",
    "stationChineseName": "馬鞍山",
    "stationName": "Ma On Shan",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d061"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "HEO",
    "stationId": "101",
    "stationChineseName": "恆安",
    "stationName": "Heng On",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d062"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "TSH",
    "stationId": "100",
    "stationChineseName": "大水坑",
    "stationName": "Tai Shui Hang",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d063"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "SHM",
    "stationId": "99",
    "stationChineseName": "石門",
    "stationName": "Shek Mun",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d064"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "CIO",
    "stationId": "98",
    "stationChineseName": "第一城",
    "stationName": "City One",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d065"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "STW",
    "stationId": "97",
    "stationChineseName": "沙田圍",
    "stationName": "Sha Tin Wai",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d066"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "CKT",
    "stationId": "96",
    "stationChineseName": "車公廟",
    "stationName": "Che Kung Temple",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d067"
    },
    "line": "MOL",
    "bound": "up",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d068"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d069"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "CKT",
    "stationId": "96",
    "stationChineseName": "車公廟",
    "stationName": "Che Kung Temple",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d06a"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "STW",
    "stationId": "97",
    "stationChineseName": "沙田圍",
    "stationName": "Sha Tin Wai",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d06b"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "CIO",
    "stationId": "98",
    "stationChineseName": "第一城",
    "stationName": "City One",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d06c"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "SHM",
    "stationId": "99",
    "stationChineseName": "石門",
    "stationName": "Shek Mun",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d06d"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "TSH",
    "stationId": "100",
    "stationChineseName": "大水坑",
    "stationName": "Tai Shui Hang",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d06e"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "HEO",
    "stationId": "101",
    "stationChineseName": "恆安",
    "stationName": "Heng On",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d06f"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "MOS",
    "stationId": "102",
    "stationChineseName": "馬鞍山",
    "stationName": "Ma On Shan",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d070"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "WKS",
    "stationId": "103",
    "stationChineseName": "烏溪沙",
    "stationName": "Wu Kai Sha",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d071"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "TUC",
    "stationId": "43",
    "stationChineseName": "東涌",
    "stationName": "Tung Chung",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d072"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d073"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "TSY",
    "stationId": "42",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d074"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d075"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d076"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "OLY",
    "stationId": "41",
    "stationChineseName": "奧運",
    "stationName": "Olympic",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d077"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "KOW",
    "stationId": "40",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d078"
    },
    "line": "TCL",
    "bound": "down",
    "stationCode": "HOK",
    "stationId": "39",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d079"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "HOK",
    "stationId": "39",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d07a"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "KOW",
    "stationId": "40",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d07b"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "OLY",
    "stationId": "41",
    "stationChineseName": "奧運",
    "stationName": "Olympic",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d07c"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d07d"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d07e"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "TSY",
    "stationId": "42",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d07f"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d080"
    },
    "line": "TCL",
    "bound": "up",
    "stationCode": "TUC",
    "stationId": "43",
    "stationChineseName": "東涌",
    "stationName": "Tung Chung",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d081"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "POA",
    "stationId": "52",
    "stationChineseName": "寶琳",
    "stationName": "Po Lam",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d082"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "HAH",
    "stationId": "51",
    "stationChineseName": "坑口",
    "stationName": "Hang Hau",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d083"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d084"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d085"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d086"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d087"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d088"
    },
    "line": "TKL",
    "bound": "TKS-DT",
    "stationCode": "LHP",
    "stationId": "57",
    "stationChineseName": "康城",
    "stationName": "LOHAS Park",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d089"
    },
    "line": "TKL",
    "bound": "TKS-DT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d08a"
    },
    "line": "TKL",
    "bound": "TKS-DT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d08b"
    },
    "line": "TKL",
    "bound": "TKS-UT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d08c"
    },
    "line": "TKL",
    "bound": "TKS-UT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d08d"
    },
    "line": "TKL",
    "bound": "TKS-UT",
    "stationCode": "LHP",
    "stationId": "57",
    "stationChineseName": "康城",
    "stationName": "LOHAS Park",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d08e"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d08f"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d090"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d091"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d092"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d093"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "HAH",
    "stationId": "51",
    "stationChineseName": "坑口",
    "stationName": "Hang Hau",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d094"
    },
    "line": "TKL",
    "bound": "up",
    "stationCode": "POA",
    "stationId": "52",
    "stationChineseName": "寶琳",
    "stationName": "Po Lam",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d095"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "TSW",
    "stationId": "25",
    "stationChineseName": "荃灣",
    "stationName": "Tsuen Wan",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d096"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "TWH",
    "stationId": "24",
    "stationChineseName": "大窩口",
    "stationName": "Tai Wo Hau",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d097"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "KWH",
    "stationId": "23",
    "stationChineseName": "葵興",
    "stationName": "Kwai Hing",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d098"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "KWF",
    "stationId": "22",
    "stationChineseName": "葵芳",
    "stationName": "Kwai Fong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d099"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d09a"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d09b"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "LCK",
    "stationId": "19",
    "stationChineseName": "茘枝角",
    "stationName": "Lai Chi Kok",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d09c"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "CSW",
    "stationId": "18",
    "stationChineseName": "長沙灣",
    "stationName": "Cheung Sha Wan",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d09d"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "SSP",
    "stationId": "17",
    "stationChineseName": "深水埗",
    "stationName": "Sham Shui Po",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d09e"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d09f"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a0"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a1"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "JOR",
    "stationId": "4",
    "stationChineseName": "佐敦",
    "stationName": "Jordan",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a2"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "TST",
    "stationId": "3",
    "stationChineseName": "尖沙咀",
    "stationName": "Tsim Sha Tsui",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a3"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a4"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a5"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a6"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a7"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "TST",
    "stationId": "3",
    "stationChineseName": "尖沙咀",
    "stationName": "Tsim Sha Tsui",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a8"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "JOR",
    "stationId": "4",
    "stationChineseName": "佐敦",
    "stationName": "Jordan",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0a9"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0aa"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ab"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ac"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "SSP",
    "stationId": "17",
    "stationChineseName": "深水埗",
    "stationName": "Sham Shui Po",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ad"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "CSW",
    "stationId": "18",
    "stationChineseName": "長沙灣",
    "stationName": "Cheung Sha Wan",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ae"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "LCK",
    "stationId": "19",
    "stationChineseName": "茘枝角",
    "stationName": "Lai Chi Kok",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0af"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b0"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b1"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "KWF",
    "stationId": "22",
    "stationChineseName": "葵芳",
    "stationName": "Kwai Fong",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b2"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "KWH",
    "stationId": "23",
    "stationChineseName": "葵興",
    "stationName": "Kwai Hing",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b3"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "TWH",
    "stationId": "24",
    "stationChineseName": "大窩口",
    "stationName": "Tai Wo Hau",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b4"
    },
    "line": "TWL",
    "bound": "up",
    "stationCode": "TSW",
    "stationId": "25",
    "stationChineseName": "荃灣",
    "stationName": "Tsuen Wan",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b5"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "TUM",
    "stationId": "120",
    "stationChineseName": "屯門",
    "stationName": "Tuen Mun",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b6"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "SIH",
    "stationId": "119",
    "stationChineseName": "兆康",
    "stationName": "Siu Hong",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b7"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "TIS",
    "stationId": "118",
    "stationChineseName": "天水圍",
    "stationName": "Tin Shui Wai",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b8"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "LOP",
    "stationId": "117",
    "stationChineseName": "朗屏",
    "stationName": "Long Ping",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0b9"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "YUL",
    "stationId": "116",
    "stationChineseName": "元朗",
    "stationName": "Yuen Long",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ba"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "KSR",
    "stationId": "115",
    "stationChineseName": "錦上路",
    "stationName": "Kam Sheung Road",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0bb"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "TWW",
    "stationId": "114",
    "stationChineseName": "荃灣西",
    "stationName": "Tsuen Wan West",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0bc"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0bd"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0be"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "AUS",
    "stationId": "111",
    "stationChineseName": "柯士甸",
    "stationName": "Austin",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0bf"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "ETS",
    "stationId": "80",
    "stationChineseName": "尖東",
    "stationName": "East Tsim Sha Tsui",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c0"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c1"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c2"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "ETS",
    "stationId": "80",
    "stationChineseName": "尖東",
    "stationName": "East Tsim Sha Tsui",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c3"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "AUS",
    "stationId": "111",
    "stationChineseName": "柯士甸",
    "stationName": "Austin",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c4"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c5"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c6"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "TWW",
    "stationId": "114",
    "stationChineseName": "荃灣西",
    "stationName": "Tsuen Wan West",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c7"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "KSR",
    "stationId": "115",
    "stationChineseName": "錦上路",
    "stationName": "Kam Sheung Road",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c8"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "YUL",
    "stationId": "116",
    "stationChineseName": "元朗",
    "stationName": "Yuen Long",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0c9"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "LOP",
    "stationId": "117",
    "stationChineseName": "朗屏",
    "stationName": "Long Ping",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ca"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "TIS",
    "stationId": "118",
    "stationChineseName": "天水圍",
    "stationName": "Tin Shui Wai",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0cb"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "SIH",
    "stationId": "119",
    "stationChineseName": "兆康",
    "stationName": "Siu Hong",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0cc"
    },
    "line": "WRL",
    "bound": "up",
    "stationCode": "TUM",
    "stationId": "120",
    "stationChineseName": "屯門",
    "stationName": "Tuen Mun",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0cd"
    },
    "line": "SIL",
    "bound": "up",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0ce"
    },
    "line": "SIL",
    "bound": "up",
    "stationCode": "OCP",
    "stationId": "86",
    "stationChineseName": "海洋公園",
    "stationName": "Ocean Park",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0cf"
    },
    "line": "SIL",
    "bound": "up",
    "stationCode": "WCH",
    "stationId": "87",
    "stationChineseName": "黃竹坑",
    "stationName": "Wong Chuk Hang",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d0"
    },
    "line": "SIL",
    "bound": "up",
    "stationCode": "LET",
    "stationId": "88",
    "stationChineseName": "利東",
    "stationName": "Lei Tung",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d1"
    },
    "line": "SIL",
    "bound": "up",
    "stationCode": "SOH",
    "stationId": "89",
    "stationChineseName": "海怡半島",
    "stationName": "South Horizons",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d2"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "SOH",
    "stationId": "89",
    "stationChineseName": "海怡半島",
    "stationName": "South Horizons",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d3"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "LET",
    "stationId": "88",
    "stationChineseName": "利東",
    "stationName": "Lei Tung",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d4"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "WCH",
    "stationId": "87",
    "stationChineseName": "黃竹坑",
    "stationName": "Wong Chuk Hang",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d5"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "OCP",
    "stationId": "86",
    "stationChineseName": "海洋公園",
    "stationName": "Ocean Park",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d6"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d7"
    },
    "line": "",
    "bound": "",
    "stationCode": "",
    "stationId": "",
    "stationChineseName": "",
    "stationName": "",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d8"
    },
    "line": "",
    "bound": "",
    "stationCode": "",
    "stationId": "",
    "stationChineseName": "",
    "stationName": "",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0d9"
    },
    "line": "",
    "bound": "",
    "stationCode": "",
    "stationId": "",
    "stationChineseName": "",
    "stationName": "",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7da2c63cc76ff857d0da"
    },
    "line": "",
    "bound": null,
    "stationCode": null,
    "stationId": null,
    "stationChineseName": null,
    "stationName": null,
    "seq": null
  }]
  return mtrStops.filter(function(x){return x.line==route && x.stationCode == stationCode})
}

function findGovHkMtrStops(mtrStopChinese, mtrStopEnglish, bound) {
  let mtrStops = [{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cedf"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "AWE",
    "stationId": "56",
    "stationChineseName": "博覽館",
    "stationName": "AsiaWorld-Expo",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee0"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "AIR",
    "stationId": "47",
    "stationChineseName": "機場",
    "stationName": "Airport",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee1"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "TSY",
    "stationId": "46",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee2"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "KOW",
    "stationId": "45",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee3"
    },
    "line": "AEL",
    "bound": "DT",
    "stationCode": "HOK",
    "stationId": "44",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee4"
    },
    "line": "AEL",
    "bound": "UT",
    "stationCode": "HOK",
    "stationId": "44",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee5"
    },
    "line": "AEL",
    "bound": "UT",
    "stationCode": "KOW",
    "stationId": "45",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee6"
    },
    "line": "AEL",
    "bound": "UT",
    "stationCode": "TSY",
    "stationId": "46",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee7"
    },
    "line": "AEL",
    "bound": "UT",
    "stationCode": "AIR",
    "stationId": "47",
    "stationChineseName": "機場",
    "stationName": "Airport",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee8"
    },
    "line": "AEL",
    "bound": "UT",
    "stationCode": "AWE",
    "stationId": "56",
    "stationChineseName": "博覽館",
    "stationName": "AsiaWorld-Expo",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cee9"
    },
    "line": "DRL",
    "bound": "DT",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceea"
    },
    "line": "DRL",
    "bound": "DT",
    "stationCode": "DIS",
    "stationId": "55",
    "stationChineseName": "迪士尼",
    "stationName": "Disneyland Resort",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceeb"
    },
    "line": "DRL",
    "bound": "UT",
    "stationCode": "DIS",
    "stationId": "55",
    "stationChineseName": "迪士尼",
    "stationName": "Disneyland Resort",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceec"
    },
    "line": "DRL",
    "bound": "UT",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceed"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "LOW",
    "stationId": "76",
    "stationChineseName": "羅湖",
    "stationName": "Lo Wu",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceee"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceef"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef0"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef1"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef2"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef3"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef4"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef5"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef6"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef7"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef8"
    },
    "line": "EAL",
    "bound": "DT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cef9"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "LMC",
    "stationId": "78",
    "stationChineseName": "落馬洲",
    "stationName": "Lok Ma Chau",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cefa"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cefb"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cefc"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cefd"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cefe"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857ceff"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf00"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf01"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf02"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf03"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf04"
    },
    "line": "EAL",
    "bound": "LMC-DT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf05"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf06"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf07"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf08"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf09"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf0a"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf0b"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf0c"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf0d"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf0e"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf0f"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf10"
    },
    "line": "EAL",
    "bound": "LMC-UT",
    "stationCode": "LMC",
    "stationId": "78",
    "stationChineseName": "落馬洲",
    "stationName": "Lok Ma Chau",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf11"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf12"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "MKK",
    "stationId": "65",
    "stationChineseName": "旺角東",
    "stationName": "Mong Kok East",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf13"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf14"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf15"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "SHT",
    "stationId": "68",
    "stationChineseName": "沙田",
    "stationName": "Sha Tin",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf16"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "FOT",
    "stationId": "69",
    "stationChineseName": "火炭",
    "stationName": "Fo Tan",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf17"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "UNI",
    "stationId": "71",
    "stationChineseName": "大學",
    "stationName": "University",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf18"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "TAP",
    "stationId": "72",
    "stationChineseName": "大埔墟",
    "stationName": "Tai Po Market",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf19"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "TWO",
    "stationId": "73",
    "stationChineseName": "太和",
    "stationName": "Tai Wo",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf1a"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "FAN",
    "stationId": "74",
    "stationChineseName": "粉嶺",
    "stationName": "Fanling",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf1b"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "SHS",
    "stationId": "75",
    "stationChineseName": "上水",
    "stationName": "Sheung Shui",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf1c"
    },
    "line": "EAL",
    "bound": "UT",
    "stationCode": "LOW",
    "stationId": "76",
    "stationChineseName": "羅湖",
    "stationName": "Lo Wu",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf1d"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "CHW",
    "stationId": "37",
    "stationChineseName": "柴灣",
    "stationName": "Chai Wan",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf1e"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "HFC",
    "stationId": "36",
    "stationChineseName": "杏花邨",
    "stationName": "Heng Fa Chuen",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf1f"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SKW",
    "stationId": "35",
    "stationChineseName": "筲箕灣",
    "stationName": "Shau Kei Wan",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf20"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SWH",
    "stationId": "34",
    "stationChineseName": "西灣河",
    "stationName": "Sai Wan Ho",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf21"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "TAK",
    "stationId": "33",
    "stationChineseName": "太古",
    "stationName": "Tai Koo",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf22"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf23"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf24"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "FOH",
    "stationId": "30",
    "stationChineseName": "炮台山",
    "stationName": "Fortress Hill",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf25"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "TIH",
    "stationId": "29",
    "stationChineseName": "天后",
    "stationName": "Tin Hau",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf26"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "CAB",
    "stationId": "28",
    "stationChineseName": "銅鑼灣",
    "stationName": "Causeway Bay",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf27"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "WAC",
    "stationId": "27",
    "stationChineseName": "灣仔",
    "stationName": "Wan Chai",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf28"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf29"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf2a"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SHW",
    "stationId": "26",
    "stationChineseName": "上環",
    "stationName": "Sheung Wan",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf2b"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "SYP",
    "stationId": "81",
    "stationChineseName": "西營盤",
    "stationName": "Sai Ying Pun",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf2c"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "HKU",
    "stationId": "82",
    "stationChineseName": "香港大學",
    "stationName": "HKU",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf2d"
    },
    "line": "ISL",
    "bound": "DT",
    "stationCode": "KET",
    "stationId": "83",
    "stationChineseName": "堅尼地城",
    "stationName": "Kennedy Town",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf2e"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "KET",
    "stationId": "83",
    "stationChineseName": "堅尼地城",
    "stationName": "Kennedy Town",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf2f"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "HKU",
    "stationId": "82",
    "stationChineseName": "香港大學",
    "stationName": "HKU",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf30"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "SYP",
    "stationId": "81",
    "stationChineseName": "西營盤",
    "stationName": "Sai Ying Pun",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf31"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "SHW",
    "stationId": "26",
    "stationChineseName": "上環",
    "stationName": "Sheung Wan",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf32"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf33"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf34"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "WAC",
    "stationId": "27",
    "stationChineseName": "灣仔",
    "stationName": "Wan Chai",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf35"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "CAB",
    "stationId": "28",
    "stationChineseName": "銅鑼灣",
    "stationName": "Causeway Bay",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf36"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "TIH",
    "stationId": "29",
    "stationChineseName": "天后",
    "stationName": "Tin Hau",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf37"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "FOH",
    "stationId": "30",
    "stationChineseName": "炮台山",
    "stationName": "Fortress Hill",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf38"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf39"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf3a"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "TAK",
    "stationId": "33",
    "stationChineseName": "太古",
    "stationName": "Tai Koo",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf3b"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "SWH",
    "stationId": "34",
    "stationChineseName": "西灣河",
    "stationName": "Sai Wan Ho",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf3c"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "SKW",
    "stationId": "35",
    "stationChineseName": "筲箕灣",
    "stationName": "Shau Kei Wan",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf3d"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "HFC",
    "stationId": "36",
    "stationChineseName": "杏花邨",
    "stationName": "Heng Fa Chuen",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf3e"
    },
    "line": "ISL",
    "bound": "UT",
    "stationCode": "CHW",
    "stationId": "37",
    "stationChineseName": "柴灣",
    "stationName": "Chai Wan",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf3f"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf40"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf41"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "LAT",
    "stationId": "38",
    "stationChineseName": "藍田",
    "stationName": "Lam Tin",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf42"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "KWT",
    "stationId": "15",
    "stationChineseName": "觀塘",
    "stationName": "Kwun Tong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf43"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "NTK",
    "stationId": "14",
    "stationChineseName": "牛頭角",
    "stationName": "Ngau Tau Kok",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf44"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "KOB",
    "stationId": "13",
    "stationChineseName": "九龍灣",
    "stationName": "Kowloon Bay",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf45"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "CHH",
    "stationId": "12",
    "stationChineseName": "彩虹",
    "stationName": "Choi Hung",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf46"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "DIH",
    "stationId": "11",
    "stationChineseName": "鑽石山",
    "stationName": "Diamond Hill",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf47"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "WTS",
    "stationId": "10",
    "stationChineseName": "黃大仙",
    "stationName": "Wong Tai Sin",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf48"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "LOF",
    "stationId": "9",
    "stationChineseName": "樂富",
    "stationName": "Lok Fu",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf49"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf4a"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "SKM",
    "stationId": "7",
    "stationChineseName": "石硤尾",
    "stationName": "Shek Kip Mei",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf4b"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf4c"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf4d"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf4e"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "HOM",
    "stationId": "84",
    "stationChineseName": "何文田",
    "stationName": "Ho Man Tin",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf4f"
    },
    "line": "KTL",
    "bound": "DT",
    "stationCode": "WHA",
    "stationId": "85",
    "stationChineseName": "黃埔",
    "stationName": "Whampo",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf50"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "WHA",
    "stationId": "85",
    "stationChineseName": "黃埔",
    "stationName": "Whampo",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf51"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "HOM",
    "stationId": "84",
    "stationChineseName": "何文田",
    "stationName": "Ho Man Tin",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf52"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf53"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf54"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf55"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "SKM",
    "stationId": "7",
    "stationChineseName": "石硤尾",
    "stationName": "Shek Kip Mei",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf56"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "KOT",
    "stationId": "8",
    "stationChineseName": "九龍塘",
    "stationName": "Kowloon Tong",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf57"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "LOF",
    "stationId": "9",
    "stationChineseName": "樂富",
    "stationName": "Lok Fu",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf58"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "WTS",
    "stationId": "10",
    "stationChineseName": "黃大仙",
    "stationName": "Wong Tai Sin",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf59"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "DIH",
    "stationId": "11",
    "stationChineseName": "鑽石山",
    "stationName": "Diamond Hill",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf5a"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "CHH",
    "stationId": "12",
    "stationChineseName": "彩虹",
    "stationName": "Choi Hung",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf5b"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "KOB",
    "stationId": "13",
    "stationChineseName": "九龍灣",
    "stationName": "Kowloon Bay",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf5c"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "NTK",
    "stationId": "14",
    "stationChineseName": "牛頭角",
    "stationName": "Ngau Tau Kok",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf5d"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "KWT",
    "stationId": "15",
    "stationChineseName": "觀塘",
    "stationName": "Kwun Tong",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf5e"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "LAT",
    "stationId": "38",
    "stationChineseName": "藍田",
    "stationName": "Lam Tin",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf5f"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf60"
    },
    "line": "KTL",
    "bound": "UT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "17.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf61"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "WKS",
    "stationId": "103",
    "stationChineseName": "烏溪沙",
    "stationName": "Wu Kai Sha",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf62"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "MOS",
    "stationId": "102",
    "stationChineseName": "馬鞍山",
    "stationName": "Ma On Shan",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf63"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "HEO",
    "stationId": "101",
    "stationChineseName": "恆安",
    "stationName": "Heng On",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf64"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "TSH",
    "stationId": "100",
    "stationChineseName": "大水坑",
    "stationName": "Tai Shui Hang",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf65"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "SHM",
    "stationId": "99",
    "stationChineseName": "石門",
    "stationName": "Shek Mun",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf66"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "CIO",
    "stationId": "98",
    "stationChineseName": "第一城",
    "stationName": "City One",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf67"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "STW",
    "stationId": "97",
    "stationChineseName": "沙田圍",
    "stationName": "Sha Tin Wai",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf68"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "CKT",
    "stationId": "96",
    "stationChineseName": "車公廟",
    "stationName": "Che Kung Temple",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf69"
    },
    "line": "MOL",
    "bound": "UT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf6a"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "TAW",
    "stationId": "67",
    "stationChineseName": "大圍",
    "stationName": "Tai Wai",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf6b"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "CKT",
    "stationId": "96",
    "stationChineseName": "車公廟",
    "stationName": "Che Kung Temple",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf6c"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "STW",
    "stationId": "97",
    "stationChineseName": "沙田圍",
    "stationName": "Sha Tin Wai",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf6d"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "CIO",
    "stationId": "98",
    "stationChineseName": "第一城",
    "stationName": "City One",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf6e"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "SHM",
    "stationId": "99",
    "stationChineseName": "石門",
    "stationName": "Shek Mun",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf6f"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "TSH",
    "stationId": "100",
    "stationChineseName": "大水坑",
    "stationName": "Tai Shui Hang",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf70"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "HEO",
    "stationId": "101",
    "stationChineseName": "恆安",
    "stationName": "Heng On",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf71"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "MOS",
    "stationId": "102",
    "stationChineseName": "馬鞍山",
    "stationName": "Ma On Shan",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf72"
    },
    "line": "MOL",
    "bound": "DT",
    "stationCode": "WKS",
    "stationId": "103",
    "stationChineseName": "烏溪沙",
    "stationName": "Wu Kai Sha",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf73"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "TUC",
    "stationId": "43",
    "stationChineseName": "東涌",
    "stationName": "Tung Chung",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf74"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf75"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "TSY",
    "stationId": "42",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf76"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf77"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf78"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "OLY",
    "stationId": "41",
    "stationChineseName": "奧運",
    "stationName": "Olympic",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf79"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "KOW",
    "stationId": "40",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf7a"
    },
    "line": "TCL",
    "bound": "DT",
    "stationCode": "HOK",
    "stationId": "39",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf7b"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "HOK",
    "stationId": "39",
    "stationChineseName": "香港",
    "stationName": "Hong Kong",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf7c"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "KOW",
    "stationId": "40",
    "stationChineseName": "九龍",
    "stationName": "Kowloon",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf7d"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "OLY",
    "stationId": "41",
    "stationChineseName": "奧運",
    "stationName": "Olympic",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf7e"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf7f"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf80"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "TSY",
    "stationId": "42",
    "stationChineseName": "青衣",
    "stationName": "Tsing Yi",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf81"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "SUN",
    "stationId": "54",
    "stationChineseName": "欣澳",
    "stationName": "Sunny Bay",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf82"
    },
    "line": "TCL",
    "bound": "UT",
    "stationCode": "TUC",
    "stationId": "43",
    "stationChineseName": "東涌",
    "stationName": "Tung Chung",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf83"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "POA",
    "stationId": "52",
    "stationChineseName": "寶琳",
    "stationName": "Po Lam",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf84"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "HAH",
    "stationId": "51",
    "stationChineseName": "坑口",
    "stationName": "Hang Hau",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf85"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf86"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf87"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf88"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf89"
    },
    "line": "TKL",
    "bound": "DT",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf8a"
    },
    "line": "TKL",
    "bound": "TKS-DT",
    "stationCode": "LHP",
    "stationId": "57",
    "stationChineseName": "康城",
    "stationName": "LOHAS Park",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf8b"
    },
    "line": "TKL",
    "bound": "TKS-DT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf8c"
    },
    "line": "TKL",
    "bound": "TKS-DT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf8d"
    },
    "line": "TKL",
    "bound": "TKS-UT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf8e"
    },
    "line": "TKL",
    "bound": "TKS-UT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf8f"
    },
    "line": "TKL",
    "bound": "TKS-UT",
    "stationCode": "LHP",
    "stationId": "57",
    "stationChineseName": "康城",
    "stationName": "LOHAS Park",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf90"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "NOP",
    "stationId": "31",
    "stationChineseName": "北角",
    "stationName": "North Point",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf91"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "QUB",
    "stationId": "32",
    "stationChineseName": "鰂魚涌",
    "stationName": "Quarry Bay",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf92"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "YAT",
    "stationId": "48",
    "stationChineseName": "油塘",
    "stationName": "Yau Tong",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf93"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "TIK",
    "stationId": "49",
    "stationChineseName": "調景嶺",
    "stationName": "Tiu Keng Leng",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf94"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "TKO",
    "stationId": "50",
    "stationChineseName": "將軍澳",
    "stationName": "Tseung Kwan O",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf95"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "HAH",
    "stationId": "51",
    "stationChineseName": "坑口",
    "stationName": "Hang Hau",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf96"
    },
    "line": "TKL",
    "bound": "UT",
    "stationCode": "POA",
    "stationId": "52",
    "stationChineseName": "寶琳",
    "stationName": "Po Lam",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf97"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "TSW",
    "stationId": "25",
    "stationChineseName": "荃灣",
    "stationName": "Tsuen Wan",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf98"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "TWH",
    "stationId": "24",
    "stationChineseName": "大窩口",
    "stationName": "Tai Wo Hau",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf99"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "KWH",
    "stationId": "23",
    "stationChineseName": "葵興",
    "stationName": "Kwai Hing",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf9a"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "KWF",
    "stationId": "22",
    "stationChineseName": "葵芳",
    "stationName": "Kwai Fong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf9b"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf9c"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf9d"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "LCK",
    "stationId": "19",
    "stationChineseName": "茘枝角",
    "stationName": "Lai Chi Kok",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf9e"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "CSW",
    "stationId": "18",
    "stationChineseName": "長沙灣",
    "stationName": "Cheung Sha Wan",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cf9f"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "SSP",
    "stationId": "17",
    "stationChineseName": "深水埗",
    "stationName": "Sham Shui Po",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa0"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa1"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa2"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa3"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "JOR",
    "stationId": "4",
    "stationChineseName": "佐敦",
    "stationName": "Jordan",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa4"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "TST",
    "stationId": "3",
    "stationChineseName": "尖沙咀",
    "stationName": "Tsim Sha Tsui",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa5"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa6"
    },
    "line": "TWL",
    "bound": "DT",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa7"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "CEN",
    "stationId": "1",
    "stationChineseName": "中環",
    "stationName": "Central",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa8"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfa9"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "TST",
    "stationId": "3",
    "stationChineseName": "尖沙咀",
    "stationName": "Tsim Sha Tsui",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfaa"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "JOR",
    "stationId": "4",
    "stationChineseName": "佐敦",
    "stationName": "Jordan",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfab"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "YMT",
    "stationId": "5",
    "stationChineseName": "油麻地",
    "stationName": "Yau Ma Tei",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfac"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "MOK",
    "stationId": "6",
    "stationChineseName": "旺角",
    "stationName": "Mong Kok",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfad"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "PRE",
    "stationId": "16",
    "stationChineseName": "太子",
    "stationName": "Prince Edward",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfae"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "SSP",
    "stationId": "17",
    "stationChineseName": "深水埗",
    "stationName": "Sham Shui Po",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfaf"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "CSW",
    "stationId": "18",
    "stationChineseName": "長沙灣",
    "stationName": "Cheung Sha Wan",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb0"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "LCK",
    "stationId": "19",
    "stationChineseName": "茘枝角",
    "stationName": "Lai Chi Kok",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb1"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb2"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "LAK",
    "stationId": "21",
    "stationChineseName": "茘景",
    "stationName": "Lai King",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb3"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "KWF",
    "stationId": "22",
    "stationChineseName": "葵芳",
    "stationName": "Kwai Fong",
    "seq": "13.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb4"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "KWH",
    "stationId": "23",
    "stationChineseName": "葵興",
    "stationName": "Kwai Hing",
    "seq": "14.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb5"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "TWH",
    "stationId": "24",
    "stationChineseName": "大窩口",
    "stationName": "Tai Wo Hau",
    "seq": "15.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb6"
    },
    "line": "TWL",
    "bound": "UT",
    "stationCode": "TSW",
    "stationId": "25",
    "stationChineseName": "荃灣",
    "stationName": "Tsuen Wan",
    "seq": "16.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb7"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "TUM",
    "stationId": "120",
    "stationChineseName": "屯門",
    "stationName": "Tuen Mun",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb8"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "SIH",
    "stationId": "119",
    "stationChineseName": "兆康",
    "stationName": "Siu Hong",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfb9"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "TIS",
    "stationId": "118",
    "stationChineseName": "天水圍",
    "stationName": "Tin Shui Wai",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfba"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "LOP",
    "stationId": "117",
    "stationChineseName": "朗屏",
    "stationName": "Long Ping",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfbb"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "YUL",
    "stationId": "116",
    "stationChineseName": "元朗",
    "stationName": "Yuen Long",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfbc"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "KSR",
    "stationId": "115",
    "stationChineseName": "錦上路",
    "stationName": "Kam Sheung Road",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfbd"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "TWW",
    "stationId": "114",
    "stationChineseName": "荃灣西",
    "stationName": "Tsuen Wan West",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfbe"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfbf"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc0"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "AUS",
    "stationId": "111",
    "stationChineseName": "柯士甸",
    "stationName": "Austin",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc1"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "ETS",
    "stationId": "80",
    "stationChineseName": "尖東",
    "stationName": "East Tsim Sha Tsui",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc2"
    },
    "line": "WRL",
    "bound": "DT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc3"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "HUH",
    "stationId": "64",
    "stationChineseName": "紅磡",
    "stationName": "Hung Hom",
    "seq": "1.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc4"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "ETS",
    "stationId": "80",
    "stationChineseName": "尖東",
    "stationName": "East Tsim Sha Tsui",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc5"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "AUS",
    "stationId": "111",
    "stationChineseName": "柯士甸",
    "stationName": "Austin",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc6"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "NAC",
    "stationId": "53",
    "stationChineseName": "南昌",
    "stationName": "Nam Cheong",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc7"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "MEF",
    "stationId": "20",
    "stationChineseName": "美孚",
    "stationName": "Mei Foo",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc8"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "TWW",
    "stationId": "114",
    "stationChineseName": "荃灣西",
    "stationName": "Tsuen Wan West",
    "seq": "6.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfc9"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "KSR",
    "stationId": "115",
    "stationChineseName": "錦上路",
    "stationName": "Kam Sheung Road",
    "seq": "7.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfca"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "YUL",
    "stationId": "116",
    "stationChineseName": "元朗",
    "stationName": "Yuen Long",
    "seq": "8.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfcb"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "LOP",
    "stationId": "117",
    "stationChineseName": "朗屏",
    "stationName": "Long Ping",
    "seq": "9.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfcc"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "TIS",
    "stationId": "118",
    "stationChineseName": "天水圍",
    "stationName": "Tin Shui Wai",
    "seq": "10.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfcd"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "SIH",
    "stationId": "119",
    "stationChineseName": "兆康",
    "stationName": "Siu Hong",
    "seq": "11.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfce"
    },
    "line": "WRL",
    "bound": "UT",
    "stationCode": "TUM",
    "stationId": "120",
    "stationChineseName": "屯門",
    "stationName": "Tuen Mun",
    "seq": "12.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfcf"
    },
    "line": "SIL",
    "bound": "UT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd0"
    },
    "line": "SIL",
    "bound": "UT",
    "stationCode": "OCP",
    "stationId": "86",
    "stationChineseName": "海洋公園",
    "stationName": "Ocean Park",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd1"
    },
    "line": "SIL",
    "bound": "UT",
    "stationCode": "WCH",
    "stationId": "87",
    "stationChineseName": "黃竹坑",
    "stationName": "Wong Chuk Hang",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd2"
    },
    "line": "SIL",
    "bound": "UT",
    "stationCode": "LET",
    "stationId": "88",
    "stationChineseName": "利東",
    "stationName": "Lei Tung",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd3"
    },
    "line": "SIL",
    "bound": "UT",
    "stationCode": "SOH",
    "stationId": "89",
    "stationChineseName": "海怡半島",
    "stationName": "South Horizons",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd4"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "SOH",
    "stationId": "89",
    "stationChineseName": "海怡半島",
    "stationName": "South Horizons",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd5"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "LET",
    "stationId": "88",
    "stationChineseName": "利東",
    "stationName": "Lei Tung",
    "seq": "2.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd6"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "WCH",
    "stationId": "87",
    "stationChineseName": "黃竹坑",
    "stationName": "Wong Chuk Hang",
    "seq": "3.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd7"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "OCP",
    "stationId": "86",
    "stationChineseName": "海洋公園",
    "stationName": "Ocean Park",
    "seq": "4.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd8"
    },
    "line": "SIL",
    "bound": "DT",
    "stationCode": "ADM",
    "stationId": "2",
    "stationChineseName": "金鐘",
    "stationName": "Admiralty",
    "seq": "5.00"
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfd9"
    },
    "line": "",
    "bound": "",
    "stationCode": "",
    "stationId": "",
    "stationChineseName": "",
    "stationName": "",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfda"
    },
    "line": "",
    "bound": "",
    "stationCode": "",
    "stationId": "",
    "stationChineseName": "",
    "stationName": "",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfdb"
    },
    "line": "",
    "bound": "",
    "stationCode": "",
    "stationId": "",
    "stationChineseName": "",
    "stationName": "",
    "seq": ""
  },{
    "_id": {
      "$oid": "5e3b7cebc63cc76ff857cfdc"
    },
    "line": "",
    "bound": "null",
    "stationCode": "null",
    "stationId": "null",
    "stationChineseName": "null",
    "stationName": "null",
    "seq": "null"
  }]
  if (!mtrStopChinese) {
    console.log(`condition 1 - !mtrStopChinese`)
    return mtrStops.filter(function(x){return x.stationName==mtrStopEnglish && x.bound == bound})
  } else if (!mtrStopEnglish) {
    console.log(`condition 2 - !mtrStopEnglish`)
    return mtrStops.filter(function(x){return x.stationChineseName==mtrStopChinese && x.bound == bound})
  } else {
    console.log(`condition 3`)
    return mtrStops
  }
}

module.exports = {
  getMtrRoutesByMtrStop:getMtrRoutesByMtrStop,
  getMtrRoutesByMtrStopChinese: getMtrRoutesByMtrStopChinese
};