
const apiHandler = require('../apiHandler')
const db = require('../citybusHelper')
const dialogflow = require('../dialogflow')
const intentHandler = require('../intentHandler')

async function handleResponse(response, sessionId) {
  let dialogFlowFulfillmentMessage = `${response.dialogFlowFulfillmentMessage}`
  let returnMessage = ''
  let outputContexts = response.outputContexts
  let intent = `${response.intent}`
    console.log(`availableEnquiries`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`response.parameters: ${JSON.stringify(response.parameters)}`)
      console.log(`availableEnquiries 1 - bizRuleRoute - sessionId: ${sessionId}`)
      try{
      returnMessage = await intentHandler.handleIntent('bizRuleRoute', sessionId)
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

module.exports = {
    handleResponse
}