
const apiHandler = require('./apiHandler')
const db = require('./db')
const dialogflow = require('./dialogflow')

async function test(userText, sessionId) {

    console.log(`test: userText-${userText}, sessionId-${sessionId}`)
    return 0
}

async function handleIntent(userText, sessionId) {
    console.log(`handleIntent: userText-${userText}, sessionId-${sessionId}`)
  let returnMessage = ''

  let response = await dialogflow.detectIntent(userText, sessionId)
  console.log(`response: ${JSON.stringify(response)}`)
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  console.log(`dialogFlowFulfillmentMessage = ${dialogFlowFulfillmentMessage}`)
  let outputContexts = response.outputContexts
  console.log(`outputContexts = ${JSON.stringify(outputContexts)}`)
  let intent = `${response.intent}`


  let default_welcome_intent = 'Default Fallback Intent'
  if (intent == default_welcome_intent) {
    console.log(`intent == default_welcome_intent`)
    // returnMessage = await getMtrRoutesByMtrStopChinese(userText, sessionId)
    returnMessage = "HELLO"
    console.log(`returnMessage = ${returnMessage}`)

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
  }

  if (intent == 'searchStopEta') {
    returnMessage = await searchCTBStopEta(userText, sessionId)
   
  } else if (intent == 'availableEnquiries') {
    returnMessage = await availableEnquiries(response, sessionId)
  } else if (intent == 'route') {
    returnMessage = await route(response, sessionId)
  } else if (intent == 'direction') {
    returnMessage = await direction(response, sessionId)
  } else if (intent == 'stop') {
    returnMessage = await stop(response, sessionId)
  }
  return returnMessage
}


async function availableEnquiries(response, sessionId) {
    let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
    let returnMessage = ''
    let outputContexts = response.outputContexts
    let intent = `${response.intent}`
      console.log(`availableEnquiries`)
      if (dialogFlowFulfillmentMessage.includes("biz")) {
        console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
        console.log(`availableEnquiries 1 - bizRuleRoute - sessionId: ${sessionId}`)
        try{
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


  async function direction(response, sessionId) {
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
  

  async function route(response, sessionId) {
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
  

  async function searchCTBStopEta(userText, sessionId) {
    let routes = await db.getCitybusETAByStop(userText)
    console.log(`1`)
    let resultString = `Stop ${routes[0].stopName} (${routes[0].stopId})
  `
        let i = 1
        console.log(`routes: ${JSON.stringify(routes)}`)
        for (var route of routes) {
          console.log(`2`)
          for (var eta of route.eta) {
            console.log(`3`)
            resultString = resultString +
  `${route.route} ${eta.minutesLeft} to ${eta.destination}
  `
          }
        }
        console.log(`resultString = ${resultString}`)
    let returnMessage = resultString
  //   } else {
  //     console.log(`route 2`)
  //     console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
  //     // console.log(`routes: ${JSON.stringify(routes.data)}`)
  //     returnMessage = 
  // `${dialogFlowFulfillmentMessage}`
  //   }
    
    return returnMessage
  }
  
  async function searchMtrStopEta(userText, sessionId) {
    let routes = await db.getMtrRoutesByMtrStop(userText)
    let returnMessage = routes
    return returnMessage
  }
  
  
  async function getMtrRoutesByMtrStopChinese(userText, sessionId) {
    let routes = await db.getMtrRoutesByMtrStopChinese(userText)
    let returnMessage = routes
    return returnMessage
  }


  async function stop(response, sessionId) {
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
    handleIntent:handleIntent,
    test:test
}