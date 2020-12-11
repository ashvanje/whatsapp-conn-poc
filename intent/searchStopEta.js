
const apiHandler = require('../apiHandler')
const db = require('../db')
const dialogflow = require('../dialogflow')
const intentHandler = require('../intentHandler')
async function handleResponse(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
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
  
  return returnMessage
}

module.exports = {
    handleResponse
}