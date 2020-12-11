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
  getMtrRoutesByMtrStop:getMtrRoutesByMtrStop
};