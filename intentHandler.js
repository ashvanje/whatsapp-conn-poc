
const apiHandler = require('./apiHandler')
const db = require('./db')
const dialogflow = require('./dialogflow')

async function handleIntent(userText, sessionId) {
  let response = await dialogflow.detectIntent(userText, sessionId)
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`

  if (intent == 'searchStopEta') {
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      let routes = await db.getCitybusETAByStop(response.parameters.stopId)
    let resultString = `Stop ${routes[0].stopName} (${routes[0].stopId})
`
        let i = 1
        console.log(`routes: ${JSON.stringify(routes)}`)
        for (var route of routes) {
          for (var eta of route.eta) {
            resultString = resultString +
`${route.route} ${eta.minutesLeft} to ${eta.destination}
`
          }
        }
      returnMessage = resultString
    } else {
      console.log(`route 2`)
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      // console.log(`routes: ${JSON.stringify(routes.data)}`)
      returnMessage = 
`${dialogFlowFulfillmentMessage}`
    }
    
  } else if (intent == 'availableEnquiries') {
    console.log(`availableEnquiries`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      console.log(`availableEnquiries 1`)
      returnMessage = await handleIntent('bizRuleRoute', sessionId)
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
  } else if (intent == 'route') {
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
  } else if (intent == 'direction') {
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

  } else if (intent == 'stop') {
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

  }
  return returnMessage
}

module.exports = {
    handleIntent
}