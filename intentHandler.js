
const apiHandler = require('./apiHandler')
const mtrHelper = require('./mtrHelper')
const dialogflow = require('./dialogflow')

async function handleIntent(userText, sessionId) {
  let returnMessage = ''

  let response = await dialogflow.detectIntent(userText, sessionId)
  let intent = `${response.intent}`

  if (intent == 'Default Fallback Intent') {
    returnMessage = await mtrHelper.getMtrRoutesByMtrStopChinese(userText)
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