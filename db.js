var axios = require('axios');
const MOMENT = require('moment');

var mongoose = require("mongoose");
var schema = new mongoose.Schema({}, { strict: false });
var model = mongoose.model("citybusroutes", schema);
var citybusfullstopsschema = new mongoose.Schema({}, { strict: false });
var citybusfullstopsmodel = mongoose.model("citybusfullstops", citybusfullstopsschema);

var govhkmtrstopschema = new mongoose.Schema({}, { strict: false });
var govhkmtrstopmodel = mongoose.model("govhkmtrstop", govhkmtrstopschema);

var mongoConnection;

const apiHandler = require('./apiHandler')

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

async function getEtaByStopId() {
  return await getCitybusETAByStop('001186');
}


async function saveAllCitybusRoutes() {
  await connectMongo();
  await model.remove({}, function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  })
  let body = jsonString.returnJson()
  for (var element of body.data) {
    console.log(`before saving to DB: ${JSON.stringify(element)}`)
    var callback = function(err,data){
      if(err)
        console.log(err);
      else
        console.log(data);
    }
    mongoose.Promise = global.Promise;
    var testPayment = new model(element);
    var saveResult = await testPayment.save(callback);
    
  }
}

async function saveCitybusFullStops() {
  await connectMongo();
  await emptyCitybusFullStops()
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  const paymentResult = await model.find({}, function (err, obj) { console.log(`${JSON.stringify(obj)}`); });
  
  // for (var element of paymentResult) {
    let responseArr = [];
  for (var i=0; i<paymentResult.length-1; i++){
    responseArr.push(
      paymentResult[i]
    )
    var element = responseArr[i]
    var company = element.get('co')
    var route = element.get('route')
    console.log(`1route = ${route}`)
    console.log(`1company = ${company}`)
    const stops = await getCitybusRouteStops(route, 'outbound', company)
    const stopsResult = await getCitybusStopName(stops, route)
    console.log(`stopsResult = ${JSON.stringify(stopsResult)}`)
  }

  return paymentResult;
}

async function getCitybusRouteStops(route, direction, busCompany) {
  console.log(`route = ${route}`)
  console.log(`direction = ${direction}`)
  console.log(`busCompany = ${busCompany}`)
  // var stopArr = await searchCitybusRouteStop(route, direction);
  // if (stopArr == undefined || stopArr.length == 0) {
    console.log(`getCitybusRouteStops: https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/${busCompany}/${route}/${direction}`)
    let response = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/${busCompany}/${route}/${direction}`, {
      params: {
      }
    });
    let responseArr = [];
    for (var i = 0; i < (response.data.data.length); i++) {
      data = {
        company: busCompany,
        route: response.data.data[i].route,
        stop: response.data.data[i].stop,
        seq: response.data.data[i].seq,
        direction: direction
      }
      console.log('data = ' + JSON.stringify(data))
      responseArr.push(
        data
      )
    }
    return responseArr
}

async function getCitybusStopName(input, route) {
  console.log(`input: ${JSON.stringify(input)}`);
  console.log(`input.length: ${input.length}`);

  for (var i = 0; i < input.length; i++) {
    console.log(`looping getCitybusStopName`)
    console.log(`input[i]: ${JSON.stringify(input[i])}`)
      stopname = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${input[i].stop}`, {});
      input[i] = Object.assign(input[i], {
        stopName: stopname.data.data.name_en,
        name_tc: stopname.data.data.name_tc,
        lat: stopname.data.data.lat,
        long: stopname.data.data.long,
        name_sc: stopname.data.data.name_sc
      });
      await saveCitybusStopToDB(input[i], route)
  }

  console.log(`input: ${JSON.stringify(input)}`)
  return input
}

async function saveCitybusStopToDB(data, route) {
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  var testPayment = new citybusfullstopsmodel(data);
  var saveResult = await testPayment.save(data, callback)
  
}

async function emptyCitybusFullStops(data, route) {
  console.log(`!!!!!!!!!!!!!!!!!!!!!!!! emptyCitybusFullStops`)
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  // var testPayment = new citybusfullstopsmodel();
  var saveResult = await citybusfullstopsmodel.remove(callback)
  
}

async function getCitybusETAByStop(stopId) {
  await connectMongo();
  console.log(`!!!!!! getCitybusETAByStop`)
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  
  // var testPayment = new citybusfullstopsmodel();
  var input = await citybusfullstopsmodel.find({'stop': stopId}, callback)
  // var input = await model.find({'route':'1'}, callback)
  console.log(`!!!!!! input: ${JSON.stringify(input)}`)

  var response = []
  for (var i = 0; i < input.length; i++) {
    var busCompany = input[i].get('company')
    var stopName = input[i].get('stopName')
    // var busCompany = 'CTB'
    var stop = stopId
    var route = input[i].get('route')
    var direction = input[i].get('direction')
    var returnInput = []
    console.log(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/${busCompany}/${stop}/${route}`)
    var stopname = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/${busCompany}/${stop}/${route}`, {})
      .then((response) => {

        let eta = ''
        let minutesLeft = ''
        let destination = ''
        if (response.data.data.length > 0) {
          for (var j = 0; j < response.data.data.length; j++) {
            console.log('eta: ' + response.data.data[j].eta)
            if(response.data.data[j].rmk_en === ""){
              let startTime = (new Date()).toLocaleString("en-US", {timeZone: "Asia/Shanghai"});;
              console.log('startTime:' + startTime);
              let endTime = (new Date(response.data.data[j].eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"});
              console.log('endTime1:' + (new Date(response.data.data[j].eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
              console.log('response.data.data[j].eta:' + response.data.data[j].eta );
              console.log('endTime2:' + endTime);

              eta = response.data.data[j].eta
              minutesLeft = 
              TimeDiff(startTime, endTime, 'minutes')
              + ' (' 
              + (new Date(response.data.data[j].eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"})
              + ') '
              destination = response.data.data[j].dest_en
              console.log(`input[i]: ${JSON.stringify(input[i])}`)
              returnInput.push({
                company: busCompany,
                bound: direction,
                route: input[i].route,
                stopName: input[i].stopName,
                eta: eta,
                minutesLeft: minutesLeft,
                destination: destination
              })
            }
          }
          if (returnInput.length == 0 ) {
            returnInput.push(Object.assign(input[i], {
              company: busCompany,
              eta: '-no scheduled bus-',
              minutesLeft: '-no scheduled bus-',
              destination: direction
            }))
          }
        } else {
          input[i] = Object.assign(input[i], {
            company: busCompany,
            eta: '-no scheduled bus-',
            minutesLeft: '-no scheduled bus-',
            destination: direction
          })
          returnInput.push(input[i])
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
  `To: ${element.destination} Arrive In: ${element.minutesLeft}
  
  `
  }
    return resultString
  } else {
    return 0
  }
  
}

module.exports = {
  connectMongo:connectMongo,
  getCitybusRouteStops:getCitybusRouteStops,
  saveCitybusStopToDB:saveCitybusStopToDB,
  getCitybusStopName:getCitybusStopName,
  getEtaByStopId:getEtaByStopId,
  saveAllCitybusRoutes:saveAllCitybusRoutes,
  saveCitybusFullStops:saveCitybusFullStops,
  getCitybusETAByStop: getCitybusETAByStop,
  getMtrRoutesByMtrStop:getMtrRoutesByMtrStop
};