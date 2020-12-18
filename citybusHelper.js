var axios = require('axios');
const MOMENT = require('moment');
var emoji = require('node-emoji')
const _ = require("lodash")

var mongoose = require("mongoose");
var citybusroutesschema = new mongoose.Schema({}, { strict: false });
var citybusroutesmodel = mongoose.model("citybusroutes", citybusroutesschema);
var citybusfullstopsschema = new mongoose.Schema({}, { strict: false });
var citybusfullstopsmodel = mongoose.model("citybusfullstops", citybusfullstopsschema);
var mongoConnection;

var citybusNameSchema = new mongoose.Schema({route:String, stop:String,data:{stop:String, name_en:String}});
var citybusStopModel = mongoose.model("CitybusStop", citybusNameSchema);
var citybusRouteStopSchema = new mongoose.Schema({route:String, bound:String,data:{}});
var citybusRouteStopModel = mongoose.model("CitybusRouteStop", citybusRouteStopSchema);

async function postInOutboundStops(company2, route2) {
  console.log('start postInOutBoundStops!')
  await connectMongo();
  let i = 1
  var data
  try{
    console.log('start postInOutBoundStops! try')
    console.log(`company: ${company2}`)
    console.log(`route: ${route2}`)
   data = {
    company: company2,
    route: route2
  }
  } catch (error) {
    console.log(`error2: ${JSON.stringify(error)}`)
    throw error
  }
  console.log('1')
      let company = data.company.toUpperCase()
      console.log('1')
      let stops = await getCitybusRouteStops(data.route, 'outbound', 0, 0, company)

      console.log('1')
      console.log(`stops: ${JSON.stringify(stops)}`)
      console.log(`stops.length: ${stops.length}`)
      let firstLastStops = []
      firstLastStops.push(stops[0]);
      firstLastStops.push(stops[stops.length-1])
      let stopNames = await getCitybusStopName(firstLastStops, data.route)
      let firstStop = stopNames[0].stopName
      let lastStop = stopNames[stopNames.length-1].stopName
      return [
        {
          direction: 'inbound',
          stop: firstStop
        },
        {
          direction: 'outbound',
          stop: lastStop
        }
      ]
    /**
     * {
     * "inbound":"xxx",
     * "outbound":"xxx"
     * }
     */
}


async function getCitybusRouteStops(route, direction, firstStop, lastStop, busCompany) {
  
  console.log('2')
  var stopArr = await searchCitybusRouteStop(route, direction);
  console.log('2')
  if (stopArr == undefined || stopArr.length == 0) {
    console.log(`getCitybusRouteStops: https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/${busCompany}/${route}/${direction}`)
    let response = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/${busCompany}/${route}/${direction}`, {
      params: {
      }
    });
    let responseArr = [];
    for (var i = firstStop; i < (lastStop == 0 ? response.data.data.length : lastStop); i++) {
      data = {
        route: response.data.data[i].route,
        stop: response.data.data[i].stop,
        seq: response.data.data[i].seq,
      }
      console.log('data = ' + JSON.stringify(data))
      responseArr.push(
        data
      )
    }
    await saveCitybusRouteStopToDB(route, direction, response.data)
    return responseArr

  } else {
    console.log(`get citybus route stop from DB`)
    let responseArr = [];
    let response = stopArr;
    console.log(`response = ${JSON.stringify(response)}`);
    for (var i = firstStop; i < (lastStop == 0 ? response.data.data.length : lastStop); i++) {
      let data = {
        route: response.data.data[i].route,
        stop: response.data.data[i].stop,
        seq: response.data.data[i].seq,
      }
      console.log('data = ' + JSON.stringify(data))
      responseArr.push(
        data
      )
    }
    return responseArr
  }
}


async function saveCitybusRouteStopToDB(route, bound, data) {
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  var testPayment = new citybusRouteStopModel({route: route, bound: bound, data: data});
  const paymentResult = await searchCitybusRouteStop(data.stop, route);
  if (paymentResult == null) {
    var saveResult = await testPayment.save(callback);
  } else {
    var saveResult = await testPayment.update({data: {stop: data.stop}}, callback)
  }
}


async function searchCitybusRouteStop (route, bound) {
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  const paymentResult = await citybusRouteStopModel.findOne({"route":route, "bound": bound}, function (err, obj) { console.log(`${JSON.stringify(obj)}`); });
  console.log(`route: ${route}, bound: ${bound}, stop from db: ${JSON.stringify(paymentResult)}`)
  return paymentResult;

}


async function getCitybusStopName(input, route) {
  var stopArr = await searchCitybusStopByRoute(route);
  console.log(`stopArr: ${JSON.stringify(stopArr)}`);
  console.log(`input: ${JSON.stringify(input)}`);
  console.log(`input.length: ${input.length}`);

  for (var i = 0; i < input.length; i++) {
    console.log(`looping getCitybusStopName`)
    console.log(`input[i]: ${JSON.stringify(input[i])}`)
    var stopname = stopArr.filter(function(item) {
      return item.data.stop == input[i].stop
    })
    if (stopname == undefined || stopname.length == 0) {
      stopname = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${input[i].stop}`, {});
      input[i] = Object.assign(input[i], {
        stopName: stopname.data.data.name_en,
        stopName_tc: stopname.data.data.name_tc
      });
      await saveCitybusStopToDB(stopname.data, route)
    } else {
      console.log(`stopname from DB: ${JSON.stringify(stopname)}`)

      input[i] = Object.assign(input[i], {
        stopName: stopname[0].data.name_en,
        stopName_tc: stopname[0].data.name_tc
      });
    }
  }

  console.log(`input: ${JSON.stringify(input)}`)
  return input
}

async function searchCitybusStopByRoute (route) {
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  var testPayment = new citybusStopModel();
  const paymentResult = await citybusStopModel.find({"route":route}, function (err, obj) { console.log(`${JSON.stringify(obj)}`); });
  console.log(`route: ${route}, stop from db: ${JSON.stringify(paymentResult)}`)
  return paymentResult;

}

async function saveCitybusStopToDB(data, route) {
  var callback = function(err,data){
    if(err)
      console.log(err);
    else
      console.log(data);
  }
  mongoose.Promise = global.Promise;
  console.log(`data: ${JSON.stringify(data)}`)
  console.log(`data: ${JSON.stringify({route: route, stop: data.data.stop, data: {stop: data.data.stop, name_en: data.data.name_en}})}`)
  var testPayment = new citybusStopModel({route: route, stop: data.data.stop, data: {stop: data.data.stop, name_en: data.data.name_en}});
  const paymentResult = await searchCitybusStopById(data.data.stop, route);
  if (paymentResult == null) {
    var saveResult = await testPayment.save(callback);
  } else {
    var saveResult = await testPayment.update({data: {stop: data.stop}}, callback)
  }
}

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


async function connectMongo() {
  if (mongoConnection == null) {
   mongoConnection = await mongoose.connect("mongodb+srv://admin:dbUserPassword@cluster0-fjcyn.mongodb.net/test?retryWrites=true&w=majority");
   console.log(`first connection to mongo`)
 } else {
   console.log(`connection to mongo already exists`)
 }
}

module.exports = {
  postInOutboundStops:postInOutboundStops,
  getCitybusRouteStops:getCitybusRouteStops,
  getCitybusETAByStop: getCitybusETAByStop,
  getCitybusStopName:getCitybusStopName
};