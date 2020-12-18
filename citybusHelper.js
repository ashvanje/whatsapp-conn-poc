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


//getFirstLastStop
async function getFirstLastStop(route) {
  console.log(`.........getFirstLastStop`)
  try {
  let fullStopList = await getFullStopIdList(route, 'outbound')
  let firstLastStop = []
  firstLastStop.push(fullStopList[0])
  firstLastStop.push(fullStopList[fullStopList.length-1])
  firstLastStop = await appendStopnameToStopList(firstLastStop)
  console.log(`.......firstLastStop...${JSON.stringify(firstLastStop)}`)
  return firstLastStop
  }catch(error){
    console.error(`${JSON.stringify(error.message)}`)
  }
}

//getFullStopList
async function getFullStopIdList(route, direction) {
  console.log(`.........getFullStopIdList`)
  let company = await getBusCompany(route)
  let stopList = await getCitybusStopList(route, direction,company)
  console.log(`.........stopList: ${JSON.stringify(stopList)}`)
  console.log(`stop getFullStopList: ${JSON.stringify(stopList)}`)
  return stopList
}

async function getFullStopIdListWithStopName(route, direction) {
  let company = await getBusCompany(route)
  let stopList = await getCitybusStopList(route, direction,company)
  console.log(`stopList 1: ${JSON.stringify(stopList)}`)
  let stopList2 = await appendStopnameToStopList(stopList)
  console.log(`stopList 2: ${JSON.stringify(stopList2)}`)
  console.log(`stop getFullStopIdListWithStopName `)
  return stopList2  
}

async function getCitybusStopList(route, direction, busCompany) {
  const stopsOfBus = await getCitybusRouteStops(route, direction,0,0,busCompany)
  return stopsOfBus
}
//getETA

async function getEta(route, direction, seq) {
  let stopId = await getStopIdBySeq(route, direction, seq)
  console.log(`getEta stopId: ${JSON.stringify(stopId)}`)
  let eta = await getCitybusETAByStopByRouteStopId(route, stopId)
  console.log(`getEta eta: ${JSON.stringify(eta)}`)
  return eta
}

async function getStopIdBySeq(route, direction, seq) {
  let busStops = await getFullStopIdList(route, direction)
  console.log(`busStops: ${JSON.stringify(busStops)}`)
  // console.log(`seq+1: ${seq+1}`)
  let busStop = busStops[parseInt(seq)-1]
  console.log(`getStopIdBySeq: ${JSON.stringify(busStop)}`)
  return busStop.stop
}








//////////////////////////////////




async function getCitybusStopName(stopId) {
  let busStop =  await citybusfullstopsmodel.findOne({stop: stopId}, function(err, obj) {console.log(`result: ${JSON.stringify(obj)}`)})
  console.log(`Search bus stop: ${JSON.stringify(busStop)}`)
  console.log(`Search bus stop2: ${ JSON.stringify({
    stopname_en: busStop.get('stopName'),
    stopname_tc: busStop.get('name_tc')
  })}`)
  return {
    stopname_en: busStop.get('stopName'),
    stopname_tc: busStop.get('name_tc')
  }
}



async function postInOutboundStops(company2, route2) {
  await connectMongo();
  var data
  try {
    data = {
      company: company2,
      route: route2
    }
  } catch (error) {
    throw error
  }
  let company = data.company.toUpperCase()
  let stops = await getCitybusRouteStops(data.route, 'outbound', 0, 0, company)

  let firstLastStops = []
  firstLastStops.push(stops[0]);
  firstLastStops.push(stops[stops.length - 1])
  // let stopNames = await getCitybusStopName(firstLastStops)
  let firstStop = await getCitybusStopName(stopNames[0].stop)
  let lastStop = await getCitybusStopName(stopNames[stops.length - 1].stop)
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

async function getBusCompany(route) {
  const routeModel = await citybusroutesmodel.findOne({"route":route}, function (err, obj) { console.log(`${JSON.stringify(obj)}`); });
  console.log(`........... routeModel: ${JSON.stringify(routeModel)}`)
  return routeModel.get('co')
}

async function getCitybusStopIdBySeqDirection(route, seq, direction) {
  let company = await getBusCompany(route)
  let stopInfo = await getCitybusRouteStops(route, direction, seq-1, seq, company)
  if (stopInfo.length > 0) {
    return stopInfo[0].stop
  } else {
    return 0
  }
}



async function getCitybusRouteStops(route, direction, firstStop, lastStop, busCompany) {

  console.log('2')
  var stopArr = []
  console.log('2')
  if (stopArr == undefined || stopArr.length == 0) {
    try {
    console.log(`getCitybusRouteStops: https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/${busCompany}/${route}/${direction}`)
    let response = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/${busCompany}/${route}/${direction}`, {
      params: {
      }
    });
    let responseArr = [];
    for (var i = firstStop; i < (lastStop == 0 ? response.data.data.length : lastStop); i++) {
      // let stopnameFromDB = await getCitybusStopName(response.data.data[i].stop)
      // console.log('stopnameFromDB = ' + JSON.stringify(stopnameFromDB))
      //       let stopnameEn = stopnameFromDB.stopname_en
      // let stopnameTc = stopnameFromDB.stopname_tc
      let data = {
        route: response.data.data[i].route,
        stop: response.data.data[i].stop,
        seq: response.data.data[i].seq,
        // stopnameEn: stopnameEn,
        // stopnameTc: stopnameTc
      }
      console.log('data = ' + JSON.stringify(data))
      responseArr.push(
        data
      )
    }
    console.log(`return responseArr: ${JSON.stringify(responseArr)}`)
    return responseArr
  } catch (error) {
    console.error(`${JSON.stringify(error.message)}`)
  }
    // await saveCitybusRouteStopToDB(route, direction, response.data)

  } else {
    console.log(`get citybus route stop from DB`)
    let responseArr = [];
    let response = stopArr;
    console.log(`response = ${JSON.stringify(response)}`);
    for (var i = firstStop; i < (lastStop == 0 ? response.data.data.length : lastStop); i++) {
      // let stopnameFromDB = await getCitybusStopName(response.data.data[i].stop)
      // console.log('stopnameFromDB = ' + JSON.stringify(stopnameFromDB))
      // let stopnameEn = stopnameFromDB.stopname_en
      // let stopnameTc = stopnameFromDB.stopname_tc
      let data = {
        route: response.data.data[i].route,
        stop: response.data.data[i].stop,
        seq: response.data.data[i].seq,
        // stopnameEn: stopnameEn,
        // stopnameTc: stopnameTc
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


// async function getCitybusStopName(input, route) {
//   var stopArr = await searchCitybusStopByRoute(route);

//   for (var i = 0; i < input.length; i++) {
//     console.log(`looping getCitybusStopName`)
//     console.log(`input[i]: ${JSON.stringify(input[i])}`)
//     var stopname = stopArr.filter(function(item) {
//       return item.data.stop == input[i].stop
//     })
//     if (stopname == undefined || stopname.length == 0) {
//       stopname = await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${input[i].stop}`, {});
//       input[i] = Object.assign(input[i], {
//         stopName: stopname.data.data.name_en,
//         stopName_tc: stopname.data.data.name_tc
//       });
//       await saveCitybusStopToDB(stopname.data, route)
//     } else {
//       console.log(`stopname from DB: ${JSON.stringify(stopname)}`)

//       input[i] = Object.assign(input[i], {
//         stopName: stopname[0].data.name_en,
//         stopName_tc: stopname[0].data.name_tc
//       });
//     }
//   }

//   console.log(`input: ${JSON.stringify(input)}`)
//   return input
// }

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


async function getCitybusETAByStopByRouteStopId(route, stopId) {
    var etaArr = []
    var busCompany = await getBusCompany(route)
    var stopName = ''
    var stop = stopId
    var route = route
    // var direction = routesOfBusStopFromDb[i].get('direction')
    var returnInput = []
    try{
    console.log(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/${busCompany}/${stop}/${route}`)
    await axios.get(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/${busCompany}/${stop}/${route}`, {})
      .then((response) => {
        console.log(`......gov hk eta response: ${JSON.stringify(response.data)}`)
        let eta = ''
        let minutesLeft = ''
        let destination = ''
        if (response.data.data.length > 0) {
          for (var j = 0; j < response.data.data.length; j++) {
            let etaResult = response.data.data[j]
            if(etaResult.rmk_en === ""){
              let startTime = (new Date()).toLocaleString("en-US", {timeZone: "Asia/Shanghai"});;
              let endTime = (new Date(etaResult.eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"});
              eta = etaResult.eta
              minutesLeft = 
              TimeDiff(startTime, endTime, 'minutes')
              + ' (' 
              + (new Date(etaResult.eta)).toLocaleString("en-US", {timeZone: "Asia/Shanghai"})
              + ') '
              destination = etaResult.dest_en
              returnInput.push({
                company: busCompany,
                // bound: direction,
                route: etaResult.route,
                stopName: etaResult.dest_en,
                stopName_tc: etaResult.dest_tc,
                eta: eta,
                minutesLeft: minutesLeft,
                destination: destination
              })
            }
          }
          if (returnInput.length == 0 ) {
            returnInput.push({
              company: busCompany,
              eta: '-no scheduled bus-',
              minutesLeft: '-no scheduled bus-',
              // destination: direction
            })
          }
        } else {
          console.log(`no scheduled bus!`)
          etaArr = {
            company: busCompany,
            eta: '-no scheduled bus-',
            minutesLeft: '-no scheduled bus-',
            // destination: direction
          }
        }
      })
      let stopName = await getCitybusStopName(stopId)
      etaArr = {
        stopId: stopId,
        stopName: stopName.stopname_en,
        stopName_tc: stopName.stopname_tc,
        route: route,
        // direction: direction,
        company: busCompany,
        eta: returnInput
      }
      return etaArr
    } catch (error) {
      console.error(`${JSON.stringify(error.message)}`)
    }
  
}

async function appendStopnameToStopList(input) {
  // console.log(`input: ${JSON.stringify(input)}`);
  console.log(`length of bus stop input: ${input.length}`);

  for (var i = 0; i < input.length; i++) {
    let stopnameFromDB = await getCitybusStopName(input[i].stop)
    // console.log(`looping getCitybusStopName ${i}`)
    // console.log(`input[i]: ${JSON.stringify(input[i])}`)
      input[i] = Object.assign(input[i], {
        stopnameEn: stopnameFromDB.stopname_en,
        stopnameTc: stopnameFromDB.stopname_tc,
        lat: stopnameFromDB.lat,
        long: stopnameFromDB.long
      });
  }
  return input
}


async function getCitybusETAByStopByStopId(stopId) {
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

const TimeDiff = (startTime, endTime, format) => {

  startTime = MOMENT(startTime, 'MM/DD/YYYY, HH:mm:ss A');
  endTime = MOMENT(endTime, 'MM/DD/YYYY, HH:mm:ss A');
  return endTime.diff(startTime, format);
}

module.exports = {
  postInOutboundStops:postInOutboundStops,
  getFirstLastStop:getFirstLastStop,
  getCitybusRouteStops:getCitybusRouteStops,
  // getCitybusETAByStop: getCitybusETAByStop,
  getFullStopIdListWithStopName:getFullStopIdListWithStopName,
  getCitybusStopName:getCitybusStopName,
  getCitybusStopList:getCitybusStopList,
  getEta: getEta
};