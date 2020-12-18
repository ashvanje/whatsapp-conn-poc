
const apiHandler = require('./apiHandler')
const mtrHelper = require('./mtrHelper')
const dialogflow = require('./dialogflow')
const citybusHelper = require('./citybusHelper')
const { citybus } = require('./constants')

async function handleIntent(userText, sessionId, param) {
  let returnMessage = ''
  console.log(`............userText: ${userText}`)
  let response = await dialogflow.detectIntent(userText, sessionId)
  let intent = `${response.intent}`
  let route
  if (intent == 'Default Fallback Intent') {
    console.log(`............Default Fallback Intent`)
    route = userText
    returnMessage = await handleIntent('lookupBusRoute', sessionId, route)
    // try{
    // returnMessage = `${JSON.stringify(await citybusHelper.getFirstLastStop('5X'))}`
    // } catch (error){
    //     console.log(`error1: ${JSON.stringify(error.message)}`)
    //     throw error
    //   }
    // try{
    // // returnMessage = `${JSON.stringify(await citybusHelper.postInOutboundStops('CTB', '5X'))}`
    // // const stopsOfBus = await citybusHelper.getEta('5X', 'outbound', 2)
    // // const stopsOfBus = await citybusHelper.getFullStopIdListWithStopName('5X','outbound')
    
    // const stopsOfBus = await citybusHelper.getEta('5X','outbound',10)
    // route = userText
    // returnMessage = `${JSON.stringify(stopsOfBus, null, 2)}`
    // } catch (error) {
    //   console.log(`error1: ${JSON.stringify(error.message)}`)
    //   throw error
    // }
    // returnMessage = await mtrHelper.getMtrRoutesByMtrStopChinese(userText)
    // var re = new RegExp("^[0-9]{1,6}$");
    // if (re.test(userText)) {
    //     console.log("6 digit number");
    //     returnMessage = await searchCTBStopEta(userText, sessionId)
    // } else {
    //   console.log("not 6 digit number");
    //   returnMessage = await searchMtrStopEta(userText, sessionId)
    //   if (returnMessage == '0') {
    //     returnMessage = await handleIntent('I want to make an enquiry', sessionId)
    //   }
    // }
  } else if (intent == 'lookupBusRoute') {
    route = param
    if (route) {
      returnMessage = await handleIntent(route, sessionId)
    } else {
      returnMessage = await handleIntent('bizRuleDirection', sessionId)
    }
  } else if (intent == 'bizRuleDirection') {
    console.log(`........intent is bizRuleDirection`)
    returnMessage = await handleBizRuleDirection(response, sessionId)
  } else if (intent == 'bizRuleStop') {
    console.log(`........intent is bizRuleStop`)
    returnMessage = await handleBizRuleStop(response, sessionId)
  } else if (intent == 'availableEnquiries') {
    returnMessage = await handleAvailableEnquiries(response, sessionId)
  } else if (intent == 'route') {
    returnMessage = await handleRoute(response, sessionId)
  } else if (intent == 'direction') {
    returnMessage = await handleDirection(response, sessionId)
  } else if (intent == 'stop') {
    returnMessage = await handleStop(response, sessionId)
  }
  return returnMessage
}


async function handleLookupBusRoute(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
  console.log(`direction`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    console.log(`direction 1`)
    returnMessage = await handleIntent('bizRuleStop', sessionId)
  } else {
    console.log(`direction 2`)
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    let direction = await citybusHelper.getFirstLastStop(response.parameters)
    // console.log(`direction: ${JSON.stringify(direction.data)}`)
    returnMessage =
      `${direction}`
  }

  return returnMessage
}


async function handleBizRuleDirection(response, sessionId) {
  console.log(`........inside bizRuleDirection`)
  console.log(`response=${JSON.stringify(response,null,2)}`)

  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
  console.log(`direction`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    console.log(`direction 1`)
    returnMessage = await handleIntent('bizRuleStop', sessionId)
  } else {
    console.log(`direction 2`)
    console.log(`response.outputContexts=${JSON.stringify(response.outputContexts,null,2)}`)
    let param = response.outputContexts.filter(function(x){
      return x.name.includes('lookupbusroute-followup')
    });
    
    console.log(`param[0]=${JSON.stringify(param[0])}`)
    let directions = await citybusHelper.getFirstLastStop(param[0].parameters.route)
    let i = 1
    for (var direction of directions) {
      console.log(`direction: ${JSON.stringify(direction)}`)
      returnMessage = returnMessage +
`${i++} ${direction.stopnameTc} ${direction.stopnameEn}
` 
    }
    console.log(`returnMessage: ${returnMessage}`)
  }

  return returnMessage
}


async function handleBizRuleStop(response, sessionId) {
  console.log(`........inside handleBizRuleStop`)
  console.log(`response=${JSON.stringify(response,null,2)}`)

  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
  console.log(`stop`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`stop 1`)
    console.log(`response.outputContexts=${JSON.stringify(response.outputContexts,null,2)}`)
    let param = response.outputContexts.filter(function(x){
      return x.name.includes('lookupbusroute-followup')
    });
    console.log(`param[0]=${JSON.stringify(param[0])}`)
    let route = param[0].parameters.route
    let direction = param[0].parameters.direction==1?'inbound':'outbound'
    let seq = param[0].parameters.stop
    let etaArr = await citybusHelper.getEta(route,direction,seq)
    let i = 1
    for (var eta of etaArr.eta) {
      console.log(`eta: ${JSON.stringify(eta)}`)
      returnMessage = returnMessage +
`${eta.stopName_tc} ${eta.minutesLeft}(for debugging)
` 
    } //TODO: format the response
    // console.log(`returnMessage: ${returnMessage}`)
    // returnMessage = `${JSON.stringify(eta, null, 2)}`
  } else {
    console.log(`stop 2`)
    console.log(`response.outputContexts=${JSON.stringify(response.outputContexts,null,2)}`)
    let param = response.outputContexts.filter(function(x){
      return x.name.includes('lookupbusroute-followup')
    });
    
    console.log(`param[0]=${JSON.stringify(param[0])}`)
    let stopList = await citybusHelper.getFullStopIdListWithStopName(param[0].parameters.route, "outbound")
    // console.log(`direction: ${JSON.stringify(direction.data)}`)
    let i = 1
    for (var stop of stopList) {
      console.log(`stop: ${JSON.stringify(stop)}`)
      returnMessage = returnMessage +
`${i++} ${stop.stopnameTc} ${stop.stopnameEn} ${stop.stop} (for debugging)
` //TODO: format the response
    }
    console.log(`returnMessage: ${returnMessage}`)
  }

  return returnMessage
}

async function handleAvailableEnquiries(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  console.log(`availableEnquiries`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    console.log(`availableEnquiries 1 - bizRuleRoute - sessionId: ${sessionId}`)
    try {
      returnMessage = await handleIntent('bizRuleRoute', sessionId)
    } catch (error) {
      console.log(`ERROR: ${error}`)
      // console.log(`ERROR: ${JSON.stringify(error)}`)
    }
  } else {
    console.log(`availableEnquiries 2`)
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    // let routes = await getRoutes()
    let testString =
      // `${dialogFlowFulfillmentMessage}
      // `
      `What type of transport are you taking?
  1) MTR
  2) Citybus
  3) NWFB
  `

    returnMessage = testString
  }
  return returnMessage
}


async function handleDirection(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
  console.log(`direction`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    console.log(`direction 1`)
    returnMessage = await handleIntent('bizRuleStop', sessionId)
  } else {
    console.log(`direction 2`)
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    let direction = await apiHandler.inoutboundstops(response.parameters)
    // console.log(`direction: ${JSON.stringify(direction.data)}`)
    returnMessage =
      `${dialogFlowFulfillmentMessage}
  ${direction}`
  }

  return returnMessage
}


async function handleRoute(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
  console.log(`route`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    console.log(`route 1`)
    returnMessage = await handleIntent('bizRuleDirection', sessionId)
  } else {
    console.log(`route 2`)
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    let routes = await apiHandler.getRoutes(response.parameters)
    // console.log(`routes: ${JSON.stringify(routes.data)}`)
    returnMessage =
      `${dialogFlowFulfillmentMessage}
  ${routes}`
  }
  return returnMessage
}

async function handleStop(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
  console.log(`askStop`)
  if (dialogFlowFulfillmentMessage.includes("biz")) {
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    let param
    console.log(`dialogFlowFulfillmentMessage = ${JSON.stringify(dialogFlowFulfillmentMessage)}`)
    console.log(`outputContexts = ${JSON.stringify(outputContexts)}`)

    outputContexts.forEach((outputContext) => {
      console.log(`outputContext = ${JSON.stringify(outputContext)}`)
      let outputContextName = `${outputContext.name}`
      console.log(`outputContextName = ${JSON.stringify(outputContextName)}`)
      if (outputContextName.includes('testfollowupintent-followup')) {
        param = outputContext
        console.log(`param = ${JSON.stringify(param)}`)

      }
    });
    // console.log(`param2 = ${JSON.stringify(param)}`)
    // let params = outputContexts
    let eta = await apiHandler.getEta(response.parameters)

    returnMessage = eta
    console.log(`askStop 1`)
    // returnMessage= await handleIntent('askStop', sessionId)
  } else {
    console.log(`askStop 2`)
    console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
    let stops = await apiHandler.mtrStops(response.parameters)
    // console.log(`stops: ${JSON.stringify(stops.data)}`)
    returnMessage =
      `
  ${dialogFlowFulfillmentMessage}
  ${stops}
  `
  }

  return returnMessage
}

module.exports = {
    handleIntent:handleIntent
}